"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
from pathlib import Path
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy import Table

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Database setup
DATABASE_URL = "sqlite:///./activities.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Association table for many-to-many relationship
activity_participants = Table(
    'activity_participants', Base.metadata,
    Column('activity_id', Integer, primary_key=True),
    Column('user_email', String, primary_key=True)
)

class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text)
    schedule = Column(String)
    max_participants = Column(Integer)
    participants = relationship("User", secondary=activity_participants, back_populates="activities")

class User(Base):
    __tablename__ = "users"
    email = Column(String, primary_key=True, index=True)
    activities = relationship("Activity", secondary=activity_participants, back_populates="participants")

Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize database with default activities if empty
def init_db():
    db = SessionLocal()
    if db.query(Activity).count() == 0:
        default_activities = [
            {"name": "Chess Club", "description": "Learn strategies and compete in chess tournaments", "schedule": "Fridays, 3:30 PM - 5:00 PM", "max_participants": 12, "participants": ["michael@mergington.edu", "daniel@mergington.edu"]},
            {"name": "Programming Class", "description": "Learn programming fundamentals and build software projects", "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM", "max_participants": 20, "participants": ["emma@mergington.edu", "sophia@mergington.edu"]},
            {"name": "Gym Class", "description": "Physical education and sports activities", "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM", "max_participants": 30, "participants": ["john@mergington.edu", "olivia@mergington.edu"]},
            {"name": "Soccer Team", "description": "Join the school soccer team and compete in matches", "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM", "max_participants": 22, "participants": ["liam@mergington.edu", "noah@mergington.edu"]},
            {"name": "Basketball Team", "description": "Practice and play basketball with the school team", "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM", "max_participants": 15, "participants": ["ava@mergington.edu", "mia@mergington.edu"]},
            {"name": "Art Club", "description": "Explore your creativity through painting and drawing", "schedule": "Thursdays, 3:30 PM - 5:00 PM", "max_participants": 15, "participants": ["amelia@mergington.edu", "harper@mergington.edu"]},
            {"name": "Drama Club", "description": "Act, direct, and produce plays and performances", "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM", "max_participants": 20, "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]},
            {"name": "Math Club", "description": "Solve challenging problems and participate in math competitions", "schedule": "Tuesdays, 3:30 PM - 4:30 PM", "max_participants": 10, "participants": ["james@mergington.edu", "benjamin@mergington.edu"]},
            {"name": "Debate Team", "description": "Develop public speaking and argumentation skills", "schedule": "Fridays, 4:00 PM - 5:30 PM", "max_participants": 12, "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]}
        ]
        for act_data in default_activities:
            participants = act_data.pop("participants")
            activity = Activity(**act_data)
            for email in participants:
                user = db.query(User).filter(User.email == email).first()
                if not user:
                    user = User(email=email)
                    db.add(user)
                activity.participants.append(user)
            db.add(activity)
        db.commit()
    db.close()

init_db()


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    db = SessionLocal()
    activities_db = db.query(Activity).all()
    activities_dict = {}
    for act in activities_db:
        activities_dict[act.name] = {
            "description": act.description,
            "schedule": act.schedule,
            "max_participants": act.max_participants,
            "participants": [user.email for user in act.participants]
        }
    db.close()
    return activities_dict


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """Sign up a student for an activity"""
    db = SessionLocal()
    activity = db.query(Activity).filter(Activity.name == activity_name).first()
    if not activity:
        db.close()
        raise HTTPException(status_code=404, detail="Activity not found")

    # Check if already signed up
    user = db.query(User).filter(User.email == email).first()
    if user and activity in user.activities:
        db.close()
        raise HTTPException(status_code=400, detail="Student is already signed up")

    # Check max participants
    if len(activity.participants) >= activity.max_participants:
        db.close()
        raise HTTPException(status_code=400, detail="Activity is full")

    # Add user if not exists
    if not user:
        user = User(email=email)
        db.add(user)

    activity.participants.append(user)
    db.commit()
    db.close()
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str):
    """Unregister a student from an activity"""
    db = SessionLocal()
    activity = db.query(Activity).filter(Activity.name == activity_name).first()
    if not activity:
        db.close()
        raise HTTPException(status_code=404, detail="Activity not found")

    user = db.query(User).filter(User.email == email).first()
    if not user or activity not in user.activities:
        db.close()
        raise HTTPException(status_code=400, detail="Student is not signed up for this activity")

    activity.participants.remove(user)
    db.commit()
    db.close()
    return {"message": f"Unregistered {email} from {activity_name}"}

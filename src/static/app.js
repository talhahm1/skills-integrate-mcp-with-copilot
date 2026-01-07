document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const signupBtn = document.getElementById("signup-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginSection = document.getElementById("login-section");
  const signupSection = document.getElementById("signup-section");
  const authContainer = document.getElementById("auth-container");
  const dashboard = document.getElementById("dashboard");
  const activitiesList = document.getElementById("activities-list");
  const myActivitiesList = document.getElementById("my-activities-list");
  const messageDiv = document.getElementById("message");

  let accessToken = localStorage.getItem("access_token");

  // Show/hide sections based on auth status
  function updateUI() {
    if (accessToken) {
      authContainer.classList.add("hidden");
      dashboard.classList.remove("hidden");
      loginBtn.classList.add("hidden");
      signupBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      loadActivities();
      loadMyActivities();
    } else {
      authContainer.classList.remove("hidden");
      dashboard.classList.add("hidden");
      loginBtn.classList.remove("hidden");
      signupBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
    }
  }

  // Navigation
  loginBtn.addEventListener("click", () => {
    loginSection.classList.remove("hidden");
    signupSection.classList.add("hidden");
  });

  signupBtn.addEventListener("click", () => {
    signupSection.classList.remove("hidden");
    loginSection.classList.add("hidden");
  });

  logoutBtn.addEventListener("click", () => {
    accessToken = null;
    localStorage.removeItem("access_token");
    updateUI();
    showMessage("Logged out successfully", "success");
  });

  // Auth forms
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        accessToken = data.access_token;
        localStorage.setItem("access_token", accessToken);
        updateUI();
        showMessage("Login successful", "success");
      } else {
        showMessage("Invalid credentials", "error");
      }
    } catch (error) {
      showMessage("Login failed", "error");
    }
  });

  document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    try {
      const response = await fetch("/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        showMessage("Account created successfully. Please login.", "success");
        signupSection.classList.add("hidden");
      } else {
        showMessage("Signup failed", "error");
      }
    } catch (error) {
      showMessage("Signup failed", "error");
    }
  });

  // Load activities
  async function loadActivities() {
    try {
      const response = await fetch("/activities", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const activities = await response.json();

      activitiesList.innerHTML = "";
      Object.entries(activities).forEach(([name, details]) => {
        const card = document.createElement("div");
        card.className = "activity-card";

        const isSignedUp = details.participants.includes(JSON.parse(atob(accessToken.split(".")[1])).sub);
        const spotsLeft = details.max_participants - details.participants.length;

        card.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Participants:</strong> ${details.participants.length}/${details.max_participants}</p>
          <button ${isSignedUp ? 'class="signed-up"' : ''} data-activity="${name}">
            ${isSignedUp ? "Unregister" : "Sign Up"}
          </button>
        `;

        card.querySelector("button").addEventListener("click", () => handleActivityAction(name, isSignedUp));
        activitiesList.appendChild(card);
      });
    } catch (error) {
      showMessage("Failed to load activities", "error");
    }
  }

  // Load user's activities
  async function loadMyActivities() {
    try {
      const response = await fetch("/activities", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const activities = await response.json();

      const userEmail = JSON.parse(atob(accessToken.split(".")[1])).sub;
      myActivitiesList.innerHTML = "";

      const myActs = Object.entries(activities).filter(([name, details]) =>
        details.participants.includes(userEmail)
      );

      if (myActs.length === 0) {
        myActivitiesList.innerHTML = "<p>You are not signed up for any activities.</p>";
      } else {
        myActs.forEach(([name, details]) => {
          const item = document.createElement("div");
          item.innerHTML = `<p><strong>${name}</strong> - ${details.schedule}</p>`;
          myActivitiesList.appendChild(item);
        });
      }
    } catch (error) {
      showMessage("Failed to load your activities", "error");
    }
  }

  // Handle sign up/unregister
  async function handleActivityAction(activityName, isSignedUp) {
    const endpoint = isSignedUp ? "unregister" : "signup";
    try {
      const response = await fetch(`/activities/${activityName}/${endpoint}`, {
        method: isSignedUp ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: JSON.parse(atob(accessToken.split(".")[1])).sub }),
      });

      if (response.ok) {
        showMessage(`${isSignedUp ? "Unregistered" : "Signed up"} successfully`, "success");
        loadActivities();
        loadMyActivities();
      } else {
        showMessage("Action failed", "error");
      }
    } catch (error) {
      showMessage("Action failed", "error");
    }
  }

  // Show message
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Initialize
  updateUI();
});

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

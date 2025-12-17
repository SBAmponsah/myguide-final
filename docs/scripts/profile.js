// Load saved profile info when page opens
document.addEventListener("DOMContentLoaded", () => {
  const profile = JSON.parse(localStorage.getItem("myguide_profile")) || {};

  document.getElementById("profile-name").value = profile.name || "";
  document.getElementById("profile-class").value = profile.classYear || "";
  document.getElementById("profile-school").value = profile.school || "";
  document.getElementById("profile-bio").value = profile.bio || "";
  document.getElementById("profile-goal").value = profile.goal || "";
});

// Save profile
document.getElementById("profile-form").addEventListener("submit", (e) => {
  e.preventDefault();

 const profile = {
  name: nameInput.value.trim(),
  classYear: classInput.value.trim(),
  school: schoolInput.value.trim()
};

localStorage.setItem("myguide_profile", JSON.stringify(profile));

  localStorage.setItem("myguide_profile", JSON.stringify(profileData));
  alert("Profile saved!");

  // reload sidebar on all pages
  if (window.parent) {
    window.parent.location.reload();
  }
});


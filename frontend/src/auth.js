export const DEMO_USERS = [
  {
    email: "admin@foodfresh.com",
    password: "admin123",
    name: "Administrator",
    role: "admin",
  },
  {
    email: "user@foodfresh.com",
    password: "user123",
    name: "Food Staff",
    role: "user",
  },
];

export function loginUser(email, password) {
  const user = DEMO_USERS.find(
    (item) =>
      item.email.toLowerCase() === email.toLowerCase() &&
      item.password === password
  );

  if (!user) {
    return null;
  }

  const loggedInUser = {
    email: user.email,
    name: user.name,
    role: user.role,
  };

  localStorage.setItem("foodfresh_user", JSON.stringify(loggedInUser));

  return loggedInUser;
}

export function getCurrentUser() {
  const savedUser = localStorage.getItem("foodfresh_user");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem("foodfresh_user");
    return null;
  }
}

export function logoutUser() {
  localStorage.removeItem("foodfresh_user");
}

export function isAdmin() {
  const user = getCurrentUser();
  return user?.role === "admin";
}
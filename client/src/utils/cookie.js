export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

export const setCookie = (name, value, days = 7) => {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  let expires = "expires=" + d.toUTCString();
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
};

export const eraseCookie = (name) => {
  document.cookie = `${name}=; Max-Age=-99999999;path=/;SameSite=Lax`;
};

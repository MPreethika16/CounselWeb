export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${encodeURIComponent(name)}=`);
  if (parts.length === 2) {
    const rawVal = parts.pop().split(';').shift();
    return decodeURIComponent(rawVal);
  }
  return null;
};

export const setCookie = (name, value, days = 7) => {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  let expires = "expires=" + d.toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax;Secure`;
};

export const eraseCookie = (name) => {
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=-99999999;path=/;SameSite=Lax;Secure`;
};

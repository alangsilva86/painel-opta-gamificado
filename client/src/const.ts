export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "Painel Opta";

export const APP_LOGO = import.meta.env.VITE_APP_LOGO || "/logo.svg";

// Login URL now defaults to home (auth é local por cookie).
export const getLoginUrl = () => "/";

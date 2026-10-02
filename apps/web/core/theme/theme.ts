/**
 * Theme storage, shared by the pre-paint script in the layout and the toggle.
 */

export type Theme = "light" | "dark" | "system";

export const THEME_KEY = "connectme_theme";

/**
 * Applies the stored theme to <html> before the first paint.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"&&t!=="system"){t="system"}var dark=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",dark);r.classList.toggle("light",!dark);if(t==="system"){r.removeAttribute("data-theme")}else{r.setAttribute("data-theme",t)}}catch(e){}})();`;

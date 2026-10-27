/**
 * Theme storage, shared by the pre-paint script in the layout and the toggle.
 */

export type Theme = "light" | "dark" | "system";

export const THEME_KEY = "connectme_theme";

/**
 * Applies the stored theme to <html> before the first paint.
 *
 * Also sets a `js` flag, which the scroll-reveal CSS uses as its gate. Without
 * it the reveal styles would hide content permanently for visitors whose JS
 * never runs (non-JS crawlers, strict extensions, a failed hydration).
 */
export const THEME_SCRIPT = `(function(){var r=document.documentElement;r.classList.add("js");try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"&&t!=="system"){t="system"}var dark=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);r.classList.toggle("dark",dark);r.classList.toggle("light",!dark);if(t==="system"){r.removeAttribute("data-theme")}else{r.setAttribute("data-theme",t)}}catch(e){}})();`;

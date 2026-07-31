import { redirect } from "next/navigation";

/**
 * The studio used to have its own login page. There is now one sign-in page for
 * everyone at /login — admin is a flag on the account, not a separate door.
 * Kept as a redirect so old links and bookmarks still land somewhere sensible.
 */
export default function AdminLoginRedirect() {
  redirect("/login?next=/admin");
}

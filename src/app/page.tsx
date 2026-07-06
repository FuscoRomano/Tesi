import { redirect } from "next/navigation";

/**
 * Pagina radice.
 * Non ha contenuto proprio: reindirizza alla Dashboard, che è la vista principale
 * della piattaforma.
 */
export default function HomePage() {
  redirect("/dashboard");
}

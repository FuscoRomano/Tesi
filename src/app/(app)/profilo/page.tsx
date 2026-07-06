import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfiloForm from "./ProfiloForm";
import styles from "./profilo.module.css";

/*
 * Pagina "Il mio profilo" (Server Component).
 * Carica l'utente autenticato e i suoi dati anagrafici da profiles, poi delega
 * la modifica al form client. È protetta dal middleware (gruppo (app)); il
 * redirect è una cintura di sicurezza ulteriore.
 */
export default async function ProfiloPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { data: profilo } = await supabase
    .from("profiles")
    .select("nome, cognome, telefono")
    .eq("id", user.id)
    .single();

  return (
    <div className={styles.pagina}>
      <header className={styles.intestazione}>
        <h1 className={styles.titolo}>Il mio profilo</h1>
        <p className={styles.sottotitolo}>
          Gestisci i tuoi dati personali, le credenziali di accesso e la sessione.
        </p>
      </header>

      <ProfiloForm
        datiIniziali={{
          nome: profilo?.nome ?? "",
          cognome: profilo?.cognome ?? "",
          telefono: profilo?.telefono ?? "",
          email: user.email ?? "",
        }}
      />
    </div>
  );
}

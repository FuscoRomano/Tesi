import Sidebar from "@/components/Sidebar/Sidebar";
import Topbar from "@/components/Topbar/Topbar";
import styles from "../layout.module.css";

/*
 * Layout del gruppo di rotte autenticate.
 * Applica la shell con Sidebar (sinistra) e Topbar (azioni utente in alto a
 * destra) a tutte le pagine sotto (app)/: /dashboard, /pazienti, /simulazioni,
 * /profilo. Le parentesi nel nome della cartella non compaiono nell'URL.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.appShell}>
      <Sidebar />
      <div className={styles.content}>
        <Topbar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

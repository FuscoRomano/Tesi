import styles from "./auth.layout.module.css";

/*
 * Layout per le pagine di autenticazione.
 * Nessuna Sidebar: schermata centrata a tutta altezza.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={styles.authShell}>{children}</div>;
}

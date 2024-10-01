import Image from "next/image";
import styles from "./page.module.css";
import Chat from "./components/Chat";

export default function Home() {
  return (
    <div className={styles.page} style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <main className={styles.main} style={{ flex: 1, width: '100%', overflow: 'hidden'  }}>
        <Chat tenantId="tenant_1" userId="test" />
      </main>
    </div>
  );
}

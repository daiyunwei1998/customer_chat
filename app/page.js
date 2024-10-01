import Image from "next/image";
import styles from "./page.module.css";
import Chat from "./components/Chat";
import { cookies } from 'next/headers'

export default function Home() {
  const tenantId = cookies().get('tenantId')?.value
  const userId = cookies().get('userId')?.value
  const jwt = cookies().get('jwt')?.value
  return (
    <div className={styles.page} style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <main className={styles.main} style={{ flex: 1, width: '100%', overflow: 'hidden'  }}>
        <Chat tenantId= {tenantId} userId={userId} jwt ={jwt} />
      </main>
    </div>
  );
}

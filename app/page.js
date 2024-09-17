import Image from "next/image";
import styles from "./page.module.css";
import Chat from "./components/Chat";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div style={{width:"500px"}}>
          <Chat></Chat> 
        </div>
        
      </main>
      <footer className={styles.footer}>
      </footer>
    </div>
  );
}

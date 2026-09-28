import Image from "next/image";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

const errorMessages: Record<string, string> = {
  invalid: "Invalid email or password.",
  rate_limited: "Too many login attempts. Please wait and try again.",
  session_expired: "Your session is no longer active. Please sign in again.",
  config: "Admin authentication is not configured.",
  unknown: "Unable to sign in. Please try again."
};

function safeRedirectPath(value: string | string[] | undefined) {
  const path = String(Array.isArray(value) ? value[0] || "" : value || "/dashboard");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectedFrom = safeRedirectPath(params.redirectedFrom);
  const errorKey = String(params.error || "");
  const error = errorMessages[errorKey];

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.logoBox}>
          <div className={styles.brandLockup}>
            <Image
              className={styles.brandLogo}
              src="/login image/fitnessmartvellore-logo-transparent.png"
              alt="Fitness Mart Vellore"
              width={540}
              height={120}
              priority
            />
            <div className={styles.brandDivider} aria-hidden="true" />
            <Image
              className={styles.brandLogo}
              src="/login image/vellore-logo-transparent.png"
              alt="Vellore Fitness Equipments"
              width={540}
              height={94}
              priority
            />
          </div>
        </div>

        <h1 className={styles.title}>Welcome Back</h1>

        <LoginForm redirectedFrom={redirectedFrom} error={error} />
      </section>
    </main>
  );
}

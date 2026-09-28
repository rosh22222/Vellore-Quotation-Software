"use client";

import Image from "next/image";
import { useStoreBrandCode } from "./store-brand-context";
import styles from "./loading-ui.module.css";
import { getStoreMarkUrl } from "@/lib/store-brand";

type LoadingUiProps = {
  variant?: "page" | "panel";
  title?: string;
  subtitle?: string;
};

export function LoadingUi({
  variant = "panel",
  title = "Loading Workspace",
  subtitle = "Preparing your Vellore Fitness dashboard"
}: LoadingUiProps) {
  const storeCode = useStoreBrandCode();
  const logoUrl = getStoreMarkUrl(storeCode) || "/login image/common-logo.png";

  return (
    <section
      className={`${styles.screen} ${variant === "page" ? styles.page : styles.panel}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.logoOrbitLoader} aria-hidden="true">
        <div className={styles.ringTrack} />
        <div className={styles.ringArc} />
        <div className={styles.innerGlow} />
        <Image
          className={styles.loaderLogo}
          src={logoUrl}
          alt=""
          width={128}
          height={128}
          priority
        />
      </div>
      <span className={styles.srOnly}>
        {title}. {subtitle}
      </span>
    </section>
  );
}

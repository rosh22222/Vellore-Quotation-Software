"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Boxes,
  FileText,
  Home,
  ImageUp,
  LogOut,
  MapPin,
  Plus,
  Settings,
  Tags,
  UserPlus,
  Users
} from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import { getStoreMarkUrl } from "@/lib/store-brand";
import type { TeamMemberRole } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/brands", label: "Brands", icon: Tags },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/members", label: "Add Member", icon: UserPlus, adminOnly: true },
  { href: "/image-to-link", label: "Image to Link", icon: ImageUp },
  { href: "/settings/company", label: "Settings", icon: Settings, adminOnly: true }
];

export function Sidebar({
  role = "Admin",
  storeCode,
  storeName = "Vellore Fitness",
  storeLogoUrl
}: {
  role?: TeamMemberRole;
  storeCode?: string;
  storeName?: string;
  storeLogoUrl?: string | null;
}) {
  const pathname = usePathname();
  const fallbackLogoUrl = storeCode === "FMV"
    ? "/login image/fitnessmartvellore-logo-transparent.png"
    : storeCode === "VFE"
      ? "/login image/vellore-logo-transparent.png"
      : null;
  const logoUrl = storeLogoUrl || fallbackLogoUrl;

  return (
    <aside className="sticky top-0 z-30 border-b border-line bg-white/95 px-4 py-4 shadow-sm backdrop-blur md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r md:py-5">
      <Link href="/dashboard" className="mb-4 flex items-center md:mb-7">
        {logoUrl ? (
          <div className="flex h-16 w-full items-center justify-center rounded-md border border-gold/40 bg-ink px-3 py-2 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={storeName}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-navy">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 text-sm font-black uppercase leading-tight text-slate-950">
              {storeName}
            </div>
          </div>
        )}
      </Link>

      <nav className="flex gap-1 overflow-x-auto pb-1 md:block md:flex-1 md:space-y-1 md:overflow-visible md:pb-0">
        {navItems.filter((item) => !item.adminOnly || role === "Admin").map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition",
                active ? "bg-mist text-ink shadow-sm" : "text-slate-700 hover:bg-rose"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden rounded-md border border-line bg-panel p-3 md:block">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
          <BarChart3 className="h-4 w-4" />
          Business Tools
        </div>
        <Link href="/quotations/new" className="btn-primary w-full text-xs">
          Create Quotation
        </Link>
      </div>

      <form action="/api/auth/logout" method="post" className="mt-3 hidden md:block">
        <button
          type="submit"
          title="Sign out"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-rose"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign Out
        </button>
      </form>
    </aside>
  );
}

function ProfileAvatar({
  name,
  storeCode,
  storeName,
  profilePhotoUrl
}: {
  name: string;
  storeCode?: string;
  storeName?: string;
  profilePhotoUrl?: string;
}) {
  const fallbackUrl = getStoreMarkUrl(storeCode, storeName);
  const [imageUrl, setImageUrl] = useState(profilePhotoUrl || fallbackUrl);
  const [imageFailed, setImageFailed] = useState(false);

  function handleImageError() {
    if (fallbackUrl && imageUrl !== fallbackUrl) {
      setImageUrl(fallbackUrl);
      return;
    }

    setImageFailed(true);
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white">
      {imageUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`${name} profile`}
          className="h-full w-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <span className="text-sm font-black text-navy">
          {(storeName || name || "VF").slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function Topbar({
  title,
  subtitle,
  user
}: {
  title: string;
  subtitle?: string;
  user: {
    name: string;
    storeCode?: string;
    storeName?: string;
    branchLocation?: string;
    profilePhotoUrl?: string;
  };
}) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }

  return (
    <header className="flex flex-col gap-3 border-b border-line bg-white/90 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:px-7">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack} className="btn-secondary shrink-0 px-3 py-1.5">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <div className="min-w-0">
          <h1 className="welcome-title text-xl font-black sm:text-2xl">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 self-end sm:w-auto sm:self-auto">
        <Link
          href="/quotations/new"
          className="btn-primary shrink-0 px-3"
          title="Create Quotation"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden lg:inline">Create Quotation</span>
          <span className="lg:hidden">Create</span>
        </Link>
        <div
          className="flex min-w-0 max-w-28 items-center gap-1.5 text-right sm:max-w-48"
          title={`Branch / Location: ${user.branchLocation || "Not set"}`}
        >
          <MapPin className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
          <div className="min-w-0">
            <div className="hidden text-[10px] font-semibold uppercase text-slate-500 sm:block">
              Branch / Location
            </div>
            <div className="truncate text-xs font-bold text-ink sm:text-sm">
              {user.branchLocation || "Not set"}
            </div>
          </div>
        </div>
        <ProfileAvatar
          name={user.name}
          storeCode={user.storeCode}
          storeName={user.storeName}
          profilePhotoUrl={user.profilePhotoUrl}
        />
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="btn-secondary px-3"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign Out
          </button>
        </form>
      </div>
    </header>
  );
}

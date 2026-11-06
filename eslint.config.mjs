import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      ".codex/**",
      "node_modules/**",
      "node_modules_corrupt_*/**",
      "output/**",
      "tmp/**"
    ]
  }
];

export default config;

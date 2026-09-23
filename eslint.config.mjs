import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      // 这条规则要求「不要在 effect 里同步 setState」（避免级联渲染）。
      // 但本项目有多处属于 SSR 场景下的必要写法，而非坏味道：
      //   1. 客户端挂载标记（Modal / Toast 的 Portal 只能在挂载后用 document）
      //   2. 读 localStorage / document.documentElement（SSR 期间不存在）
      //   3. IntersectionObserver 不可用时的降级（SSR 期间同样 undefined）
      // 这些一旦挪到 render 期就会引发 hydration 不一致，只能放 effect 里。
      // 降级为 warn：不阻断 CI，但保留可见性，新代码若真写出级联渲染会被看到。
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  {
    // Electron 主进程是 CommonJS 脚本，require() 是它的正确写法
    files: ["electron-app/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },

  // 关掉与 Prettier 冲突的格式化规则：格式交给 Prettier，ESLint 只管正确性。
  // 放最后，确保它的「关闭」生效。
  prettier,

  globalIgnores([
    // eslint-config-next 自带的默认忽略
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // 本项目额外忽略
    "design/**", // 静态设计稿（参考稿，非源码；tsconfig 亦已 exclude）
    "data/**", // 本机数据与访问令牌，已 gitignore
    "certs/**", // 本机证书
    "release/**", // 打包产物
    "docs/screenshots/**", // 截图
    ".workbuddy-ai/**", // AI 协作助手的本地工作日志
  ]),
]);

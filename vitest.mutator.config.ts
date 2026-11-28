import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["src/domain/**/*.test.ts", "src/pipeline.test.ts"],
    coverage: {
      enabled: false,
    },
  },
});

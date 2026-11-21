import { createRoot } from "react-dom/client";

import "./index.css";
import { App } from "./ui/App.tsx";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("root element not found");

createRoot(rootElement).render(<App />);

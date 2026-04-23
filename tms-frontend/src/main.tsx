import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { bootstrapClassData } from "./app/services/classService";
import { bootstrapStudentData } from "./app/services/studentService";
import "./styles/index.css";

async function bootstrap(): Promise<void> {
  await bootstrapClassData();
  await bootstrapStudentData();
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();

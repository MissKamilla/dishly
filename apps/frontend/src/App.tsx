import { useQuery } from "@tanstack/react-query";
import { Link, Route, Routes } from "react-router-dom";

type HealthResponse = {
  status: string;
};

const healthUrl = new URL("/health", import.meta.env.VITE_API_URL).toString();

function HomePage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async (): Promise<HealthResponse> => {
      const response = await fetch(healthUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch backend health");
      }

      return response.json();
    },
  });

  return (
    <>
      <h1>Dishly frontend</h1>
      <p>
        Backend:{" "}
        {healthQuery.isPending
          ? "checking"
          : healthQuery.isError
            ? "unavailable"
            : healthQuery.data.status}
      </p>
    </>
  );
}

function LoginPage() {
  return <h1>Login</h1>;
}

function RecipesPage() {
  return <h1>Recipes</h1>;
}

function App() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link> | <Link to="/login">Login</Link> |{" "}
        <Link to="/recipes">Recipes</Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
      </Routes>
    </>
  );
}

export default App;

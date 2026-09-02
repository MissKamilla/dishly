import { Link, Route, Routes } from "react-router-dom";

function HomePage() {
  return <h1>Dishly frontend</h1>;
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

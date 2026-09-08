import { useState } from "react";
import { login } from "../services/api";

function Login({ onLogin, notice }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSubmitting(true);
            setError("");

            const user = await login(email, password);

            onLogin(user);
        } catch (err) {
            console.error(err);

            const status = err.response?.status;

            if (status === 401) {
                setError("Invalid email or password.");
            } else if (status === 403) {
                setError(
                    err.response?.data?.detail ??
                    "This account is not active."
                );
            } else {
                setError("Could not reach the RiskLens API.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-screen">

            <form className="login-card" onSubmit={handleSubmit}>

                <div className="login-header">
                    <h1>RiskLens</h1>
                    <p>Sign in to continue</p>
                </div>

                {notice && (
                    <div className="login-notice">
                        {notice}
                    </div>
                )}

                <div className="login-field">
                    <label htmlFor="email">Email</label>

                    <input
                        id="email"
                        type="email"
                        autoComplete="username"
                        value={email}
                        required
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="login-field">
                    <label htmlFor="password">Password</label>

                    <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        required
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                <button
                    className="login-button"
                    type="submit"
                    disabled={submitting}
                >
                    {submitting ? "Signing in..." : "Sign in"}
                </button>

            </form>

        </div>
    );
}

export default Login;

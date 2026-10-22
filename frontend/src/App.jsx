
import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:5000";

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sc_user")) || null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("sc_token") || ""
  );
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState("services");
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingMin, setBookingMin] = useState("");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CUSTOMER",
  });

  const [serviceForm, setServiceForm] = useState({
    title: "",
    description: "",
    category: "Home Services",
    price: "",
  });

  function clearMessages() {
    setNotice("");
    setError("");
  }

  function showError(err, fallback) {
    setError(err.response?.data?.message || fallback);
  }

  async function fetchServices() {
    try {
      const response = await axios.get(`${API}/api/services`);
      setServices(response.data.services || []);
    } catch (err) {
      showError(err, "Could not load services. Check whether the backend is running.");
    }
  }

  async function fetchBookings(currentToken = token) {
    if (!currentToken) {
      setBookings([]);
      return;
    }

    try {
      const response = await axios.get(`${API}/api/bookings`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      setBookings(response.data.bookings || []);
    } catch (err) {
      showError(err, "Could not load your bookings.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    axios.get(`${API}/api/services`)
      .then((response) => {
        if (!cancelled) setServices(response.data.services || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || "Could not load services. Check whether the backend is running.");
        }
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      Promise.resolve().then(() => {
        if (!cancelled) setBookings([]);
      });
      return () => { cancelled = true; };
    }

    axios.get(`${API}/api/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!cancelled) setBookings(response.data.bookings || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "Could not load your bookings.");
      });

    return () => { cancelled = true; };
  }, [token]);

  async function handleAuth(event) {
    event.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      if (authMode === "register") {
        await axios.post(`${API}/api/auth/register`, authForm);
        setNotice("Account created! Please log in with your new account.");
        setAuthMode("login");
        setAuthForm((previous) => ({
          ...previous,
          name: "",
          password: "",
        }));
      } else {
        const response = await axios.post(`${API}/api/auth/login`, {
          email: authForm.email,
          password: authForm.password,
        });

        const newToken = response.data.token;
        const newUser = response.data.user;

        localStorage.setItem("sc_token", newToken);
        localStorage.setItem("sc_user", JSON.stringify(newUser));

        setToken(newToken);
        setUser(newUser);
        setPage("services");
        setAuthForm({
          name: "",
          email: "",
          password: "",
          role: "CUSTOMER",
        });
        setNotice(`Welcome back, ${newUser.name}!`);
      }
    } catch (err) {
      showError(err, "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("sc_token");
    localStorage.removeItem("sc_user");
    setToken("");
    setUser(null);
    setPage("services");
    setSelectedService(null);
    clearMessages();
    setNotice("You have logged out.");
  }

  async function handleCreateService(event) {
    event.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      await axios.post(`${API}/api/services`, {
        ...serviceForm,
        price: Number(serviceForm.price),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setServiceForm({
        title: "",
        description: "",
        category: "Home Services",
        price: "",
      });
      setNotice("Your service has been published!");
      setPage("services");
      await fetchServices();
    } catch (err) {
      showError(err, "Could not publish the service.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBooking(event) {
    event.preventDefault();
    clearMessages();

    if (!selectedService || !bookingDate) {
      setError("Please select a booking date and time.");
      return;
    }

    const date = new Date(bookingDate);

    if (Number.isNaN(date.getTime()) || date <= new Date()) {
      setError("Please choose a future date and time.");
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `${API}/api/bookings`,
        {
          serviceId: selectedService.id,
          bookingDate: date.toISOString(),
          notes: "",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNotice(`Booking requested for ${selectedService.title}.`);
      setSelectedService(null);
      setBookingDate("");
      setPage("bookings");
      await fetchBookings(token);
    } catch (err) {
      showError(err, "Could not create your booking.");
    } finally {
      setLoading(false);
    }
  }

  async function updateBookingStatus(bookingId, status) {
    clearMessages();
    setLoading(true);

    try {
      await axios.patch(
        `${API}/api/bookings/${bookingId}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNotice(`Booking marked as ${status.toLowerCase()}.`);
      await fetchBookings(token);
    } catch (err) {
      showError(err, "Could not update the booking.");
    } finally {
      setLoading(false);
    }
  }

  const isProvider = user?.role === "PROVIDER";
  const isCustomer = user?.role === "CUSTOMER";

  return (
    <div className="app-shell">
      <header className="navbar">
        <a className="brand" href="#" onClick={() => setPage("services")}>
          <span className="brand-icon">S</span>
          <span>Service<span className="brand-accent">Connect</span></span>
        </a>

        <nav className="nav-links">
          <button
            className={page === "services" ? "nav-link active" : "nav-link"}
            onClick={() => setPage("services")}
          >
            Explore services
          </button>

          {isProvider && (
            <button
              className={page === "create" ? "nav-link active" : "nav-link"}
              onClick={() => setPage("create")}
            >
              Publish a service
            </button>
          )}

          {user && (
            <button
              className={page === "bookings" ? "nav-link active" : "nav-link"}
              onClick={() => {
                setPage("bookings");
                fetchBookings(token);
              }}
            >
              My bookings
            </button>
          )}
        </nav>

        <div className="nav-account">
          {user ? (
            <>
              <span className="welcome-user">
                Hi, {user.name}
                <small>{user.role.toLowerCase()}</small>
              </span>
              <button className="button button-outline button-small" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <button
              className="button button-primary button-small"
              onClick={() => {
                setAuthMode("login");
                setPage("auth");
                clearMessages();
              }}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <main>
        {notice && (
          <div className="message success-message">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Dismiss message">×</button>
          </div>
        )}

        {error && (
          <div className="message error-message">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">×</button>
          </div>
        )}

        {page === "services" && (
          <>
            <section className="hero-section">
              <div className="hero-content">
                <span className="eyebrow">YOUR LOCAL SERVICE MARKETPLACE</span>
                <h1>Good help is<br /><span>closer than you think.</span></h1>
                <p>
                  Discover trusted services, connect with providers,
                  and book the help you need in just a few clicks.
                </p>
                <button
                  className="button button-primary hero-button"
                  onClick={() => document.getElementById("service-list")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Explore services <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="hero-art" aria-hidden="true">
                <div className="art-circle circle-back"></div>
                <div className="art-card art-card-top">
                  <span className="art-emoji">✦</span>
                  <div><strong>Reliable help</strong><small>Right when you need it</small></div>
                </div>
                <div className="art-main-icon">⌂</div>
                <div className="art-card art-card-bottom">
                  <span className="art-check">✓</span>
                  <div><strong>Booking made simple</strong><small>Less searching, more living</small></div>
                </div>
              </div>
            </section>

            <section className="service-section" id="service-list">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">FIND YOUR NEXT SERVICE</span>
                  <h2>Services for everyday life</h2>
                  <p>Explore services offered by our local providers.</p>
                </div>
                <span className="service-count">{services.length} services</span>
              </div>

              {services.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">⌂</span>
                  <h3>No services available yet</h3>
                  <p>Be the first provider to publish a service on ServiceConnect.</p>
                  {isProvider && (
                    <button className="button button-primary" onClick={() => setPage("create")}>
                      Publish a service
                    </button>
                  )}
                </div>
              ) : (
                <div className="service-grid">
                  {services.map((service, index) => (
                    <article className="service-card" key={service.id}>
                      <div className={`service-visual visual-${index % 4}`}>
                        <span className="service-visual-icon">
                          {service.category?.toLowerCase().includes("clean") ? "✧"
                            : service.category?.toLowerCase().includes("repair") ? "⚒"
                            : service.category?.toLowerCase().includes("tutor") ? "✎"
                            : service.category?.toLowerCase().includes("garden") ? "❋"
                            : "⌂"}
                        </span>
                        <span className="category-pill">{service.category}</span>
                      </div>

                      <div className="service-card-body">
                        <div className="service-title-row">
                          <h3>{service.title}</h3>
                          <strong className="price">₹{Number(service.price).toLocaleString("en-IN")}</strong>
                        </div>
                        <p className="service-description">{service.description}</p>
                        <div className="provider-line">
                          <span className="provider-avatar">
                            {service.provider?.name?.charAt(0)?.toUpperCase() || "P"}
                          </span>
                          <span>By {service.provider?.name || "Local provider"}</span>
                        </div>

                        {isCustomer && (
                          <button
                            className="button button-primary full-button"
                            onClick={() => {
                              setSelectedService(service);
                              setBookingDate("");
                              setBookingMin(new Date(Date.now() + 60000).toISOString().slice(0, 16));
                              clearMessages();
                            }}
                          >
                            Book service <span aria-hidden="true">→</span>
                          </button>
                        )}

                        {!user && (
                          <button
                            className="button button-outline full-button"
                            onClick={() => {
                              setAuthMode("login");
                              setPage("auth");
                              setNotice("Sign in as a customer to book a service.");
                            }}
                          >
                            Sign in to book
                          </button>
                        )}

                        {isProvider && service.providerId === user.id && (
                          <div className="owner-note">Your published service</div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {selectedService && isCustomer && (
              <div className="modal-backdrop" onClick={() => setSelectedService(null)}>
                <section
                  className="booking-modal"
                  onClick={(event) => event.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="booking-heading"
                >
                  <button className="modal-close" onClick={() => setSelectedService(null)} aria-label="Close">
                    ×
                  </button>
                  <span className="eyebrow">BOOK A SERVICE</span>
                  <h2 id="booking-heading">{selectedService.title}</h2>
                  <p>{selectedService.description}</p>
                  <div className="booking-price">
                    Service price <strong>₹{Number(selectedService.price).toLocaleString("en-IN")}</strong>
                  </div>
                  <form onSubmit={handleBooking} className="form-stack">
                    <label htmlFor="bookingDate">Choose date and time</label>
                    <input
                      id="bookingDate"
                      type="datetime-local"
                      required
                      value={bookingDate}
                      min={bookingMin}
                      onChange={(event) => setBookingDate(event.target.value)}
                    />
                    <button className="button button-primary full-button" disabled={loading}>
                      {loading ? "Submitting..." : "Confirm booking request"}
                    </button>
                  </form>
                </section>
              </div>
            )}
          </>
        )}

        {page === "auth" && (
          <section className="auth-layout">
            <div className="auth-promo">
              <span className="eyebrow">WELCOME TO SERVICECONNECT</span>
              <h1>Make life a little easier.</h1>
              <p>Find services, meet local providers, and keep all your bookings in one place.</p>
              <div className="promo-points">
                <span>✓ Simple service discovery</span>
                <span>✓ Convenient booking requests</span>
                <span>✓ Your bookings, all together</span>
              </div>
            </div>

            <div className="auth-card">
              <div className="auth-tabs">
                <button
                  className={authMode === "login" ? "auth-tab selected" : "auth-tab"}
                  onClick={() => { setAuthMode("login"); clearMessages(); }}
                >
                  Sign in
                </button>
                <button
                  className={authMode === "register" ? "auth-tab selected" : "auth-tab"}
                  onClick={() => { setAuthMode("register"); clearMessages(); }}
                >
                  Create account
                </button>
              </div>

              <h2>{authMode === "login" ? "Welcome back" : "Join ServiceConnect"}</h2>
              <p className="auth-subtitle">
                {authMode === "login"
                  ? "Enter your details to continue."
                  : "Create an account to get started."}
              </p>

              <form className="form-stack" onSubmit={handleAuth}>
                {authMode === "register" && (
                  <>
                    <label htmlFor="name">Full name</label>
                    <input
                      id="name"
                      required
                      placeholder="Your name"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    />
                    <label htmlFor="role">I want to join as</label>
                    <select
                      id="role"
                      value={authForm.role}
                      onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                    >
                      <option value="CUSTOMER">Customer — book services</option>
                      <option value="PROVIDER">Provider — publish services</option>
                    </select>
                  </>
                )}

                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />

                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={authMode === "register" ? 8 : undefined}
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  placeholder={authMode === "register" ? "At least 8 characters" : "Enter your password"}
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                />

                <button className="button button-primary full-button auth-submit" disabled={loading}>
                  {loading ? "Please wait..." : authMode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="auth-switch">
                {authMode === "login" ? "New to ServiceConnect?" : "Already have an account?"}{" "}
                <button onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  clearMessages();
                }}>
                  {authMode === "login" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </div>
          </section>
        )}

        {page === "create" && isProvider && (
          <section className="page-panel">
            <div className="panel-heading">
              <span className="eyebrow">GROW YOUR BUSINESS</span>
              <h1>Publish a service</h1>
              <p>Tell customers what you offer and how much it costs.</p>
            </div>
            <form className="service-form form-stack" onSubmit={handleCreateService}>
              <label htmlFor="serviceTitle">Service title</label>
              <input
                id="serviceTitle"
                required
                maxLength={100}
                placeholder="e.g. Home Cleaning"
                value={serviceForm.title}
                onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
              />

              <label htmlFor="serviceDescription">Description</label>
              <textarea
                id="serviceDescription"
                required
                rows="4"
                maxLength={1000}
                placeholder="Describe the service you provide..."
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              />

              <label htmlFor="serviceCategory">Category</label>
              <select
                id="serviceCategory"
                value={serviceForm.category}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
              >
                <option>Home Services</option>
                <option>Cleaning</option>
                <option>Repairs & Maintenance</option>
                <option>Education & Tutoring</option>
                <option>Gardening</option>
                <option>Beauty & Wellness</option>
                <option>Other</option>
              </select>

              <label htmlFor="servicePrice">Price (₹)</label>
              <input
                id="servicePrice"
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="e.g. 499"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
              />

              <button className="button button-primary full-button" disabled={loading}>
                {loading ? "Publishing..." : "Publish service"}
              </button>
            </form>
          </section>
        )}

        {page === "bookings" && user && (
          <section className="service-section bookings-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR ACTIVITY</span>
                <h2>My bookings</h2>
                <p>
                  {isProvider
                    ? "Review requests for services you provide."
                    : "Keep track of the services you've requested."}
                </p>
              </div>
              <button className="button button-outline button-small" onClick={() => fetchBookings(token)}>
                Refresh
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">▤</span>
                <h3>No bookings yet</h3>
                <p>Your booking activity will appear here.</p>
                <button className="button button-primary" onClick={() => setPage("services")}>
                  Explore services
                </button>
              </div>
            ) : (
              <div className="booking-list">
                {bookings.map((booking) => (
                  <article className="booking-card" key={booking.id}>
                    <div className="booking-symbol">⌂</div>
                    <div className="booking-details">
                      <h3>{booking.service?.title || "Service booking"}</h3>
                      <p>
                        {new Date(booking.bookingDate).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="booking-meta">
                        {isProvider
                          ? `Customer: ${booking.customer?.name || "Customer"}`
                          : `Provider: ${booking.service?.providerId ? "Service provider" : "Provider"}`}
                      </p>
                      {booking.notes && <p className="booking-meta">Note: {booking.notes}</p>}
                    </div>
                    <div className="booking-actions">
                      <span className={`status status-${booking.status.toLowerCase()}`}>
                        {booking.status}
                      </span>

                      {isCustomer && booking.status === "PENDING" && (
                        <button
                          className="button button-outline button-small"
                          disabled={loading}
                          onClick={() => updateBookingStatus(booking.id, "CANCELLED")}
                        >
                          Cancel
                        </button>
                      )}

                      {isProvider && booking.status === "PENDING" && (
                        <>
                          <button
                            className="button button-primary button-small"
                            disabled={loading}
                            onClick={() => updateBookingStatus(booking.id, "CONFIRMED")}
                          >
                            Confirm
                          </button>
                          <button
                            className="button button-outline button-small"
                            disabled={loading}
                            onClick={() => updateBookingStatus(booking.id, "CANCELLED")}
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {isProvider && booking.status === "CONFIRMED" && (
                        <button
                          className="button button-primary button-small"
                          disabled={loading}
                          onClick={() => updateBookingStatus(booking.id, "COMPLETED")}
                        >
                          Mark completed
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {page !== "services" && page !== "auth" && page !== "bookings" && page !== "create" && (
          <section className="empty-state">
            <h2>Page not found</h2>
            <button className="button button-primary" onClick={() => setPage("services")}>
              Back to services
            </button>
          </section>
        )}
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#" onClick={() => setPage("services")}>
          <span className="brand-icon">S</span>
          <span>Service<span className="brand-accent">Connect</span></span>
        </a>
        <p>Connecting people with the services they need.</p>
        <span>© {new Date().getFullYear()} ServiceConnect</span>
      </footer>
    </div>
  );
}

export default App;

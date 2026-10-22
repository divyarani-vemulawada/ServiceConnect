
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("./db");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to perform this action",
      });
    }
    next();
  };
}


const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ message: "ServiceConnect is running" });
});

// Register a customer
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
       role:
            req.body.role === "PROVIDER"
              ? "PROVIDER"
                : "CUSTOMER",
            },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.status(201).json({
      message: "Registration successful",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Could not register user" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Could not log in" });
  }
});


const validStatuses = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

// Browse all services
app.get("/api/services", async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        provider: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ services });
  } catch (error) {
    console.error("Fetch services error:", error);
    res.status(500).json({ message: "Could not fetch services" });
  }
});

// Publish a service (providers only)
app.post(
  "/api/services",
  authenticateToken,
  requireRole("PROVIDER"),
  async (req, res) => {
    try {
      const { title, description, category, price } = req.body;
      const numericPrice = Number(price);

      if (
        !title?.trim() ||
        !description?.trim() ||
        !category?.trim() ||
        price === undefined ||
        price === null ||
        price === "" ||
        !Number.isFinite(numericPrice) ||
        numericPrice <= 0
      ) {
        return res.status(400).json({
          message: "Provide a title, description, category and valid positive price",
        });
      }

      const service = await prisma.service.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          price: numericPrice,
          providerId: req.user.userId,
        },
      });

      res.status(201).json({
        message: "Service published successfully",
        service,
      });
    } catch (error) {
      console.error("Create service error:", error);
      res.status(500).json({ message: "Could not publish service" });
    }
  }
);

// Get one service
app.get("/api/services/:id", async (req, res) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: {
        provider: {
          select: { id: true, name: true },
        },
      },
    });

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ service });
  } catch (error) {
    console.error("Fetch service error:", error);
    res.status(500).json({ message: "Could not fetch service" });
  }
});



 // Create a booking (customers only)
app.post(
  "/api/bookings",
  authenticateToken,
  requireRole("CUSTOMER"),
  async (req, res) => {
    try {
      const { serviceId, bookingDate, notes } = req.body;
      const date = new Date(bookingDate);

      if (
        !serviceId ||
        !bookingDate ||
        Number.isNaN(date.getTime()) ||
        date <= new Date()
      ) {
        return res.status(400).json({
          message: "Provide a service ID and a future booking date",
        });
      }

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      if (service.providerId === req.user.userId) {
        return res.status(400).json({
          message: "You cannot book your own service",
        });
      }

      const booking = await prisma.booking.create({
        data: {
          customerId: req.user.userId,
          serviceId,
          bookingDate: date,
          notes: typeof notes === "string" ? notes.trim() || null : null,
        },
        include: {
          service: true,
        },
      });

      res.status(201).json({
        message: "Booking created successfully",
        booking,
      });
    } catch (error) {
      console.error("Create booking error:", error);
      res.status(500).json({ message: "Could not create booking" });
    }
  }
);

// View bookings belonging to the logged-in customer or provider
app.get("/api/bookings", authenticateToken, async (req, res) => {
  try {
    let where;

    if (req.user.role === "CUSTOMER") {
      where = { customerId: req.user.userId };
    } else if (req.user.role === "PROVIDER") {
      where = {
        service: { providerId: req.user.userId },
      };
    } else {
      return res.status(403).json({
        message: "This account cannot access marketplace bookings",
      });
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        service: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ bookings });
  } catch (error) {
    console.error("Fetch bookings error:", error);
    res.status(500).json({ message: "Could not fetch bookings" });
  }
});

// Update a booking status
app.patch(
  "/api/bookings/:id/status",
  authenticateToken,
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid booking status",
        });
      }

      const booking = await prisma.booking.findUnique({
        where: { id: req.params.id },
        include: { service: true },
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const isCustomer = booking.customerId === req.user.userId;
      const isProvider =
        booking.service.providerId === req.user.userId;

      // Customers can only cancel their own pending bookings.
      // Providers can confirm, complete, or cancel their own service bookings.
      const customerCanCancel =
        isCustomer &&
        status === "CANCELLED" &&
        booking.status === "PENDING";

      const providerCanUpdate =
        isProvider &&
        req.user.role === "PROVIDER" &&
        ["CONFIRMED", "COMPLETED", "CANCELLED"].includes(status) &&
        (
          (status === "CONFIRMED" && booking.status === "PENDING") ||
          (status === "COMPLETED" && booking.status === "CONFIRMED") ||
          (status === "CANCELLED" &&
            ["PENDING", "CONFIRMED"].includes(booking.status))
        );

      if (!customerCanCancel && !providerCanUpdate) {
        return res.status(403).json({
          message: "You cannot make this booking status change",
        });
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: { status },
      });

      res.json({
        message: "Booking status updated",
        booking: updatedBooking,
      });
    } catch (error) {
      console.error("Update booking error:", error);
      res.status(500).json({ message: "Could not update booking" });
    }
  }
);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`ServiceConnect server running on port ${PORT}`);
});

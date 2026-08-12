import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.render("index", { title: "Browse Events" });
});

router.get("/login", (req: Request, res: Response) => {
  res.render("login", { title: "Log In" });
});

router.get("/register", (req: Request, res: Response) => {
  res.render("register", { title: "Create Account" });
});

router.get("/events/:id", (req: Request, res: Response) => {
  res.render("event", { title: "Event", eventId: req.params.id });
});

router.get("/my-tickets", (req: Request, res: Response) => {
  res.render("my-tickets", { title: "My Tickets" });
});

router.get("/dashboard", (req: Request, res: Response) => {
  res.render("dashboard", { title: "Dashboard" });
});

router.get("/dashboard/events/new", (req: Request, res: Response) => {
  res.render("event-form", { title: "New Event", eventId: null });
});

router.get("/dashboard/events/:id/edit", (req: Request, res: Response) => {
  res.render("event-form", { title: "Edit Event", eventId: req.params.id });
});

router.get("/dashboard/events/:id/tickets", (req: Request, res: Response) => {
  res.render("event-tickets", {
    title: "Event Tickets",
    eventId: req.params.id,
  });
});

router.get("/scan", (req: Request, res: Response) => {
  res.render("scan", { title: "Scan Tickets" });
});

export default router;

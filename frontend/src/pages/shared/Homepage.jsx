import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  QrCode,
  Syringe,
  FileSearch,
  BarChart3,
  Megaphone,
  ChevronRight,
  Mail,
  CheckCircle2,
  ArrowRight,
  Building2,
  Clock,
  MapPin,
} from "lucide-react";

const HERO_SLIDES = [
  {
    image: "/assets/carousel.jpg",
    label: "Pet Registration",
    title: "Register your pet with confidence.",
    description:
      "Create a secure digital record for your pet and keep important information ready whenever you need it.",
  },
  {
    image: "/assets/carousel3.jpg",
    label: "What We Offer",
    title: "Complete veterinary care in one place.",
    description:
      "Everything you need to register, protect, and manage your pet through one official city service.",
    features: [
      {
        title: "Pet Registration",
        description: "Create a verified digital pet record.",
      },
      {
        title: "QR Pet ID",
        description: "Access pet details through a scannable code.",
      },
      {
        title: "Vaccination Tracking",
        description: "Keep vaccination history and due dates organized.",
      },
      {
        title: "Record Requests",
        description: "Request certificates and health records online.",
      },
      {
        title: "Public Health Analytics",
        description: "Support better city-wide veterinary planning.",
      },
    ],
  },
  {
    image: "/assets/carousel3.jpg",
    label: "About City Veterinary Office",
    title: "Caring for Cabuyao pets and families.",
    description:
      "The City Veterinary Office supports a healthier community through accessible, reliable, and responsible pet care.",
  },
  {
    image: "/assets/carousel4.jpg",
    label: "Veterinary Services",
    title: "Support for every stage of pet care.",
    description:
      "From anti-rabies vaccination to clinical records, stay connected to the services your pet needs.",
  },
  {
    image: "/assets/carousel5.jpg",
    label: "Digital Pet Records",
    title: "Your pet's health history, always within reach.",
    description:
      "Track verified records, QR identification, vaccination history, and requests from your own portal.",
  },
];

function FacebookIcon() {
  return (
    <svg
      className="footer-channel-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default function Homepage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [visibleSlide, setVisibleSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef(null);

  const goToNextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveSlide((current) => (current + 1) % HERO_SLIDES.length);
  };

  const goToPreviousSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveSlide(
      (current) => (current - 1 + HERO_SLIDES.length) % HERO_SLIDES.length,
    );
  };

  useEffect(() => {
    const autoplayTimer = window.setInterval(() => {
      setIsTransitioning(true);
      setActiveSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 6000);

    return () => window.clearInterval(autoplayTimer);
  }, [activeSlide]);

  useEffect(() => {
    if (isTransitioning) {
      // Fade out current visible slide first
      const fadeOutTimer = setTimeout(() => {
        setVisibleSlide(activeSlide);
      }, 500); // Wait for fade out to complete

      const resetTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, 1200); // Total transition time (0.5s + 0.6s delay + 0.5s + buffer)

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [isTransitioning, activeSlide]);

  useEffect(() => {
    HERO_SLIDES.forEach(({ image }) => {
      const preloadImage = new Image();
      preloadImage.src = image;
    });
  }, []);

  const handleTouchStart = (event) => {
    if (!event.changedTouches?.length) return;
    touchStartX.current = event.changedTouches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null || !event.changedTouches?.length) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 45) return;
    if (distance < 0) goToNextSlide();
    else goToPreviousSlide();
  };

  const slide = HERO_SLIDES[activeSlide];

  return (
    <div className="homepage">
      <div className="homepage-hero-scrim" aria-hidden="true" />
      <div
        className={`homepage-slide-background homepage-slide-background--visible ${isTransitioning ? "is-fading-out" : ""}`}
        style={{ backgroundImage: `url(${HERO_SLIDES[visibleSlide].image})` }}
        aria-hidden="true"
      />
      <div
        className={`homepage-slide-background homepage-slide-background--next ${isTransitioning ? "is-fading-in" : ""}`}
        style={{ backgroundImage: `url(${HERO_SLIDES[activeSlide].image})` }}
        aria-hidden="true"
      />
      <div className="homepage-hero-screen">
        <nav className="homepage-nav">
          <div className="homepage-logo-group">
            <div className="homepage-crest">
              <img
                src="/assets/City%20Vet%20Official%20Logo.jpg"
                alt="Cabuyao City Veterinary Office logo"
              />
            </div>
            <div className="homepage-logo-text">
              <strong>Cabuyao City Veterinary Office</strong>
              <span>Official Page</span>
            </div>
          </div>
          <div className="homepage-nav-links">
            <a href="#services">Services</a>
            <a href="#about">About</a>
          </div>
          <div className="homepage-auth-links">
            <Link to="/owner/register">Register</Link>
            <Link to="/owner/login" className="homepage-login-link">
              Log In
            </Link>
          </div>
        </nav>

        <div className="advisory-strip">
          <span className="advisory-badge">Advisory</span>
          <span>
            Pet registration is now processed online. Visit your barangay
            veterinary desk if you need in-person assistance.
          </span>
        </div>

        <section
          className="hero-banner"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="hero-inner">
            <span className="hero-eyebrow">{slide.label}</span>
            <h1>{slide.title}</h1>
            <p>{slide.description}</p>
            {slide.features && (
              <div className="hero-feature-list" aria-label="System features">
                {slide.features.map((feature) => (
                  <div className="hero-feature-card" key={feature.title}>
                    <CheckCircle2 size={16} />
                    <span>
                      <strong>{feature.title}</strong>
                      <small>{feature.description}</small>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            className="hero-carousel"
            aria-label="Featured veterinary services"
          >
            <div className="hero-carousel-controls">
              <span className="carousel-count">
                {String(activeSlide + 1).padStart(2, "0")} /{" "}
                {String(HERO_SLIDES.length).padStart(2, "0")}
              </span>
              <button
                type="button"
                className="carousel-next"
                aria-label="Next slide"
                onClick={goToNextSlide}
              >
                Next
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="stat-strip">
        <div className="stat-tile">
          <p className="stat-value">18</p>
          <p className="stat-label">Barangays Served</p>
        </div>
        <div className="stat-tile">
          <p className="stat-value">QR</p>
          <p className="stat-label">Digital Pet ID</p>
        </div>
        <div className="stat-tile">
          <p className="stat-value">24/7</p>
          <p className="stat-label">Online Registration</p>
        </div>
        <div className="stat-tile">
          <p className="stat-value">100%</p>
          <p className="stat-label">Paperless Records</p>
        </div>
      </div>

      <section className="section" id="services">
        <span className="section-eyebrow">What we offer</span>
        <h2>Veterinary services, digitized</h2>
        <p className="section-lead">
          Every step of your pet's health record — from first registration to
          renewal — handled through one official system.
        </p>
        <div className="service-grid">
          <div className="service-card">
            <div className="service-icon">
              <ShieldCheck size={22} />
            </div>
            <h3>Pet Registration</h3>
            <p>
              Submit your pet's details online and get verified by clinic staff.
            </p>
          </div>
          <div className="service-card">
            <div className="service-icon">
              <QrCode size={22} />
            </div>
            <h3>QR Pet ID</h3>
            <p>
              Every verified pet receives a scannable QR code linked to its full
              record.
            </p>
          </div>
          <div className="service-card">
            <div className="service-icon">
              <Syringe size={22} />
            </div>
            <h3>Vaccination Tracking</h3>
            <p>
              See vaccination history and due dates for anti-rabies and other
              shots.
            </p>
          </div>
          <div className="service-card">
            <div className="service-icon">
              <FileSearch size={22} />
            </div>
            <h3>Record Requests</h3>
            <p>
              Request vaccination cards and certificates without visiting the
              office.
            </p>
          </div>
          <div className="service-card">
            <div className="service-icon">
              <BarChart3 size={22} />
            </div>
            <h3>Public Health Analytics</h3>
            <p>
              City-wide vaccination and registration data supports public health
              planning.
            </p>
          </div>
          <div className="service-card">
            <div className="service-icon">
              <Megaphone size={22} />
            </div>
            <h3>Community Outreach</h3>
            <p>
              Free vaccination and deworming drives that bring care closer to
              your barangay.
            </p>
          </div>
        </div>
      </section>

      <section className="section about-section" id="about">
        <span className="section-eyebrow">About us</span>
        <h2>Cabuyao City Veterinary Office</h2>
        <p className="section-lead">
          We provide accessible veterinary services and reliable digital pet
          records to help Cabuyao pet owners keep their pets healthy, protected,
          and properly registered.
        </p>

        <div className="about-grid">
          <div className="about-hero-card">
            <div className="about-hero-panel">
              <div className="about-hero-icon">
                <Building2 size={22} />
              </div>
              <span className="about-hero-kicker">Who we are</span>
              <h3>The Office</h3>
              <p className="about-hero-statement">
                A division of the City Government keeping Cabuyao's pets
                healthy, protected, and properly registered — one verified
                record at a time.
              </p>
              <div className="about-hero-stats">
                <div className="about-fact">
                  <strong>18</strong>
                  <span>Barangays served</span>
                </div>
                <div className="about-fact">
                  <strong>Online</strong>
                  <span>+ barangay desks</span>
                </div>
              </div>
            </div>
            <div className="about-hero-copy">
              <h4>A trusted partner for every pet owner</h4>
              <p>
                The Cabuyao City Veterinary Office is a division of the City
                Government that delivers veterinary services and secure digital
                pet records across all 18 barangays of the city.
              </p>
              <p>
                Through online registration and barangay veterinary desks, pet
                owners can register their pets, obtain a QR Pet ID, and monitor
                vaccinations without repeated visits to the office.
              </p>
              <ul className="about-hero-list">
                <li>
                  <CheckCircle2 size={16} /> Online pet registration
                </li>
                <li>
                  <CheckCircle2 size={16} /> QR Pet ID issuance
                </li>
                <li>
                  <CheckCircle2 size={16} /> Vaccination monitoring
                </li>
                <li>
                  <CheckCircle2 size={16} /> Digital health records
                </li>
              </ul>
            </div>
          </div>

          <div className="about-split-card">
            <div className="about-split-page">
              <div className="about-split-head">
                <div className="about-card-icon">
                  <ArrowRight size={18} />
                </div>
                <div>
                  <span className="about-card-kicker">Getting started</span>
                  <h3>How It Works</h3>
                </div>
              </div>
              <ol className="about-steps">
                <li>
                  <span className="about-step-num">1</span>
                  <p className="about-step-text">
                    <strong>Register your pet</strong>
                    <span>Online or at your barangay veterinary desk.</span>
                  </p>
                </li>
                <li>
                  <span className="about-step-num">2</span>
                  <p className="about-step-text">
                    <strong>Verification</strong>
                    <span>Staff reviews and approves your registration.</span>
                  </p>
                </li>
                <li>
                  <span className="about-step-num">3</span>
                  <p className="about-step-text">
                    <strong>Get the QR Pet ID</strong>
                    <span>Your pet's scannable digital record.</span>
                  </p>
                </li>
                <li>
                  <span className="about-step-num">4</span>
                  <p className="about-step-text">
                    <strong>Track records</strong>
                    <span>Follow vaccination and health records in your portal.</span>
                  </p>
                </li>
              </ol>
            </div>

            <div className="about-split-page">
              <div className="about-split-head">
                <div className="about-card-icon">
                  <Clock size={18} />
                </div>
                <div>
                  <span className="about-card-kicker">Office hours</span>
                  <h3>Schedule</h3>
                </div>
              </div>
              <div className="hours-table" aria-label="Office operating hours">
                <div className="hours-row">
                  <span className="hours-day">Monday</span>
                  <span className="hours-time">8:00 AM - 5:00 PM</span>
                  <span className="hours-pill is-open">Open</span>
                </div>
                <div className="hours-row">
                  <span className="hours-day">Tuesday</span>
                  <span className="hours-time">8:00 AM - 5:00 PM</span>
                  <span className="hours-pill is-open">Open</span>
                </div>
                <div className="hours-row">
                  <span className="hours-day">Wednesday</span>
                  <span className="hours-time">8:00 AM - 5:00 PM</span>
                  <span className="hours-pill is-open">Open</span>
                </div>
                <div className="hours-row">
                  <span className="hours-day">Thursday</span>
                  <span className="hours-time">8:00 AM - 5:00 PM</span>
                  <span className="hours-pill is-open">Open</span>
                </div>
                <div className="hours-row">
                  <span className="hours-day">Friday</span>
                  <span className="hours-time">8:00 AM - 5:00 PM</span>
                  <span className="hours-pill is-open">Open</span>
                </div>
                <div className="hours-row is-closed">
                  <span className="hours-day">Saturday</span>
                  <span className="hours-time">Closed</span>
                  <span className="hours-pill">Closed</span>
                </div>
                <div className="hours-row is-closed">
                  <span className="hours-day">Sunday</span>
                  <span className="hours-time">Closed</span>
                  <span className="hours-pill">Closed</span>
                </div>
              </div>
              <p className="hours-note">
                Closed on Saturdays, Sundays, and regular holidays.
              </p>
            </div>
          </div>
        </div>

        <div className="about-map-card">
          <div className="about-map-card-body">
            <div className="about-card-icon">
              <MapPin size={20} />
            </div>
            <div>
              <h3>Visit Us</h3>
              <p>
                City Veterinary Office
                <br />
                Marinig Road, Cabuyao City, Laguna
              </p>
            </div>
            <a
              className="about-map-link"
              href="https://www.google.com/maps/search/?api=1&query=14.2780679,121.1405366"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Google Maps
            </a>
          </div>
          <iframe
            className="about-map-frame"
            title="Cabuyao City Veterinary Office location map"
            src="https://maps.google.com/maps?q=14.2780679,121.1405366&z=16&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>

      <footer className="homepage-footer">
        <p className="homepage-footer-text">
          For inquiries and assistance, visit our official Facebook page for
          more info's
        </p>
        <div className="homepage-footer-channels">
          <a
            href="https://www.facebook.com/cabuyaoveterinaryoffice.gov.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-channel-link footer-channel-link--facebook"
          >
            <FacebookIcon />
            Facebook
          </a>
          <a
            href="mailto:admin@cityvet.gov.ph"
            className="footer-channel-link footer-channel-link--email"
          >
            <Mail size={17} />
            admin@cityvet.gov.ph
          </a>
        </div>
      </footer>
    </div>
  );
}

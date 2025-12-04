import { useState, useEffect, useRef } from 'react';

interface NavbarProps {
  sections?: Array<{ id: string; label: string }>;
}

const Navbar: React.FC<NavbarProps> = ({
  sections = [
    { id: 'me', label: 'me' },
    { id: 'projects', label: 'projects' },
    { id: 'fun', label: 'fun' }
  ]
}) => {

  const [activeSection, setActiveSection] = useState<string>('me');

  const [theme, setTheme] = useState<string>('dark');

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const navbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions: IntersectionObserverInit = {
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    };

    const sectionVisibility = new Map<string, number>();

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        const sectionId = entry.target.id;

        if (entry.isIntersecting) {
          sectionVisibility.set(sectionId, entry.intersectionRatio);
        } else {
          sectionVisibility.delete(sectionId);
        }
      });

      let maxVisibility = 0;
      let mostVisibleSection = 'me';

      sectionVisibility.forEach((ratio, id) => {
        if (ratio > maxVisibility) {
          maxVisibility = ratio;
          mostVisibleSection = id;
        }
      });

      if (sectionVisibility.size > 0) {
        setActiveSection(mostVisibleSection);
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sections]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const navbarHeight = navbarRef.current?.offsetHeight || 0;

      if (currentScrollY > lastScrollY.current && currentScrollY > navbarHeight) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY <= 0 ? 0 : currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      setTheme(currentTheme || 'dark');
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    const handleHashChange = () => {
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      const lenis = (window as any).lenis;
      
      if (lenis) {
        lenis.scrollTo(targetSection, {
          offset: 0,
          duration: 1.2,
          immediate: false
        });
      } else {
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }

      setActiveSection(sectionId);

      setTimeout(() => {
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }, 10);
    }
  };

  const handleThemeToggle = () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');

    if (currentTheme === 'light') {
      html.removeAttribute('data-theme');
      localStorage.setItem('theme', 'default');
    } else {
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  const getLinkClasses = (sectionId: string) => {
    const isActive = activeSection === sectionId;

    const baseClasses = 'nav-link cursor-pointer px-3 py-1 rounded-md transition-all duration-200 font-medium';

    if (isActive) {
      return `${baseClasses} active font-semibold`;
    }

    return baseClasses;
  };

  return (
    <div
      ref={navbarRef}
      id="navbar"
      className="bg-[#111111]/80 dark:bg-[#111111]/80 backdrop-blur-md text-white z-50 sticky left-1/2 transform -translate-x-1/2 h-12 w-[380px] border border-white/20 rounded-full flex justify-between px-6 items-center transition-all duration-300 shadow-lg nav-links"
      style={{
        top: isVisible ? '1rem' : '-5rem'
      }}
    >
      <div className="flex gap-1">
        {sections.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => handleNavClick(e, id)}
            aria-label={`Navigate to ${label} section`}
            className={getLinkClasses(id)}
            data-section={id}
          >
            {label}
          </a>
        ))}
      </div>

      <div className="h-6 w-[1px] bg-white/20 dark:bg-white/20 navbar-divider mx-2"></div>

      <button
        id="theme-toggle"
        aria-label="toggle theme"
        className="cursor-pointer p-1.5 rounded-full hover:bg-white/10 transition-all duration-200"
        onClick={handleThemeToggle}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {theme === 'light' ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          )}
        </svg>
      </button>
    </div>
  );
};

export default Navbar;

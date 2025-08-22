import tailwindTypography from '@tailwindcss/typography';
import tailwindAnimate from 'tailwindcss-animate';

module.exports = {
  purge: {
    options: {
      safelist: [
        /^border-/, // Safelist all classes starting with 'border-'
        /^bg-/, // Safelist all classes starting with 'bg-'
      ],
    },
  },
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'zoom-pulse-slow': 'zoom-pulse 8s ease infinite',
        'zoom-pulse-fast': 'zoom-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'bg-pan-fast': 'bg-pan 7s ease infinite',
        'bg-pan-slow': 'bg-pan 15s ease infinite',
        'tab-hover-normal': 'tab-hover 200ms ease forwards',
        'tab-unhover-normal': 'tab-unhover 1000ms ease forwards',
        'slide-left': 'slide-left 400ms cubic-bezier(0.87, 0, 0.3, 1) forwards',
        'slide-right':
          'slide-right 400ms cubic-bezier(0.87, 0, 0.3, 1) forwards',
        'slide-in-from-left':
          'slide-in-from-left 400ms cubic-bezier(0.87, 0, 0.3, 1) forwards',
        'slide-in-from-right':
          'slide-in-from-right 400ms cubic-bezier(0.87, 0, 0.3, 1) forwards',
        'slide-in-from-top':
          'slide-in-from-top 400ms cubic-bezier(0.87, 0, 0.3, 1) forwards',
        'slide-in-from-bottom':
          'slide-in-from-bottom 400ms cubic-bezier(0.87, 0, 0.3, 1) forwards',
        'slide-out-to-left':
          'slide-out-to-left 400ms cubic-bezier(0.87, 0, 0.3, 1) forwards',
        'slide-out-to-right':
          'slide-out-to-right 400ms cubic-bezier(0.87, 0, 0.3, 1) forwards',
        'slide-out-to-top':
          'slide-out-to-top 400ms cubic-bezier(0.87, 0, 0.3, 1) forwards',
        'slide-out-to-bottom':
          'slide-out-to-bottom 400ms cubic-bezier(0.87, 0, 0.3, 1) forwards',
        shimmerEffect: 'shimmer 1.5s linear forwards infinite',
        'fade-in': 'fade-in 200ms ease forwards',
        'fade-out': 'fade-out 200ms ease forwards',
        marquee: 'marquee 45s linear infinite',
        'reverse-marquee': 'reverse-marquee 45s linear infinite',
        'zoom-enter': 'zoom-enter 0.4s ease forwards',
        'zoom-leave': 'zoom-leave 0.4s ease forwards',
      },
      backgroundColor: {
        'theme-dark': '#24292e',
        'theme-light': '#f8f8f9',
        'theme-activity-bar-dark': '#24292e',
        'theme-activity-bar-light': '#f8f8f9',
        'theme-activity-bar-separator-dark': 'rgb(107 114 128 / 1)',
        'theme-activity-bar-separator-light': 'rgb(180 180 180 / 1)',
        'theme-dropdown-dark': '#413e4f',
        'theme-dropdown-light': '#ffffff',
        'theme-dropdown-hover-dark': '#676473',
        'theme-dropdown-hover-light': '#f0f0f0',
        'theme-hover-dark': 'rgb(76 77 93 / 0.3)',
        'theme-hover-light': '#f0f0f0',
        'theme-secondary-menu-dark': '#24292e',
        'theme-secondary-menu-light': '#ffffff',
        'theme-select-dark': '#2f363d',
        'theme-select-light': '#f2f8ff',
        'theme-setting-hover-dark': '#252b2f',
        'theme-setting-hover-light': '#f0f0f0',
        'theme-setting-selected-dark': '#262b31',
        'theme-setting-selected-light': '#f3f6f8',
        'theme-tag-panel-light': '#fbfbfb',
        'theme-tag-panel-dark': '#353e4e',
        'theme-task-section-dark': '#24292e',
        'theme-task-section-light': '#ffffff',
        'theme-tooltip-dark': '#24292e',
        'theme-tooltip-light': '#ffffff',
        solar: '#efece6',
      },
      backgroundSize: {
        auto: 'auto',
        cover: 'cover',
        contain: 'contain',
        '175%': '175%',
        '200%': '200%',
        solar: '#efece6',
      },
      borderColor: {
        'theme-border-dark': '#1b1f23',
        'theme-border-light': '#e7e5e4',
        'theme-button-border-dark': 'rgba(100, 100, 100, 1)',
        'theme-button-border-light': '#f0f0f0',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        'theme-button-dark': 'rgb(180, 180, 180)',
        'theme-button-light': 'rgb(90, 90, 90)',
        'theme-button-hover-dark': '#f3f3f3',
        'theme-button-hover-light': '#f0f0f0',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      fill: {
        'theme-tooltip-dark': '#24292e',
        'theme-tooltip-light': '#ffffff',
      },
      fontFamily: {
        editor: ['var(--font-lato)'],
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: 0,
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: 0,
          },
        },
        'bg-pan': {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
          '100%': {
            backgroundPosition: '0% 50%',
          },
        },
        'tab-hover': {
          '0%': {
            backgroundPosition: '100% 50%',
            opacity: 0.7,
          },
          '100%': {
            backgroundPosition: '0% 50%',
            opacity: 1,
          },
        },
        'tab-unhover': {
          '0%': {
            backgroundPosition: '0% 50%',
            opacity: 1,
          },
          '100%': {
            backgroundPosition: '100% 50%',
            opacity: 0.7,
          },
        },
        'zoom-pulse': {
          '0%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.05)',
          },
          '100%': {
            transform: 'scale(1)',
          },
        },
        'slide-left': {
          from: {
            transform: 'translateX(0)',
          },
          to: {
            transform: 'translateX(-150%)',
          },
        },
        'slide-right': {
          from: {
            transform: 'translateX(-150%)',
          },
          to: {
            transform: 'translateX(0)',
          },
        },
        'slide-in-from-left': {
          from: {
            opacity: 0,
            transform: 'translateX(-100%)',
          },
          to: {
            opacity: 1,
            transform: 'translateX(0)',
          },
        },
        'slide-in-from-right': {
          from: {
            opacity: 0,
            transform: 'translateX(100%)',
          },
          to: {
            opacity: 1,
            transform: 'translateX(0)',
          },
        },
        'slide-in-from-top': {
          from: {
            opacity: 0,
            transform: 'translateY(-100%)',
          },
          to: {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
        'slide-in-from-bottom': {
          from: {
            opacity: 0,
            transform: 'translateY(100%)',
          },
          to: {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
        'slide-out-to-left': {
          from: {
            opacity: 1,
            transform: 'translateX(0)',
          },
          to: {
            opacity: 0,
            transform: 'translateX(-100%)',
          },
        },
        'slide-out-to-right': {
          from: {
            opacity: 1,
            transform: 'translateX(0)',
          },
          to: {
            opacity: 0,
            transform: 'translateX(100%)',
          },
        },
        'slide-out-to-top': {
          from: {
            opacity: 1,
            transform: 'translateY(0)',
          },
          to: {
            opacity: 0,
            transform: 'translateY(-100%)',
          },
        },
        'slide-out-to-bottom': {
          from: {
            opacity: 1,
            transform: 'translateY(0)',
          },
          to: {
            opacity: 0,
            transform: 'translateY(100%)',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '100% 0',
          },
          '100%': {
            backgroundPosition: '-100% 0',
          },
        },
        'fade-in': {
          from: {
            opacity: 0,
          },
          to: {
            opacity: 1,
          },
        },
        'fade-out': {
          from: {
            opacity: 1,
          },
          to: {
            opacity: 0,
          },
        },
        marquee: {
          '0%': {
            transform: 'translateX(0%)',
          },
          '100%': {
            transform: 'translateX(-100%)',
          },
        },
        'reverse-marquee': {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(0%)',
          },
        },
        'zoom-enter': {
          '0%': {
            transform: 'scale(0.5)',
          },
          '100%': {
            transform: 'scale(1)',
          },
        },
        'zoom-leave': {
          '0%': {
            transform: 'scale(1)',
          },
          '100%': {
            transform: 'scale(0.5)',
          },
        },
      },
      textColor: {
        'theme-dark': '#383850',
        'theme-light': '#24292e',
        'theme-activity-bar-tab-dark': 'rgb(230 230 245 / 1)',
        'theme-activity-bar-tab-light': 'rgb(40 40 40 / 1)',
        'theme-activity-bar-tab-hover-dark': 'rgb(220 220 235 / 1)',
        'theme-activity-bar-tab-hover-light': 'rgb(65 65 65 / 1)',
        'theme-button-icon-dark': 'rgb(180, 180, 180)',
        'theme-button-icon-light': 'rgb(90, 90, 90)',
        'theme-button-icon-hover-dark': 'rgb(245, 245, 245)',
        'theme-button-icon-hover-light': 'rgb(40, 40, 40)',
        'theme-danger-dark': '#e5534b',
        'theme-danger-light': '#e5534b',
        'theme-secondary-light': '#505463',
        'theme-secondary-dark': '#7b8092',
        'theme-tag-panel-light': '#353e4e',
        'theme-tag-panel-dark': '#353e4e',
      },
      maxHeight: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        '9/10': '90%',
        full: '100%',
      },
      minWidth: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '2/3': '66%',
        '3/4': '75%',
        full: '100%',
      },
    },
    fontSize: {
      '2xs': '0.75rem',
      xs: '0.8125rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1rem',
      xl: '1.125rem',
      '2xl': '1.25rem',
      '3xl': '1.75rem',
      '4xl': '2.5rem',
      '5xl': '3.5rem',
    },
    screens: {
      '2xs': '380px',
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1400px',
      '3xl': '1600px',
      '4xl': '1920px',
    },
  },
  variants: {
    extend: {
      visibility: ['group-hover'],
    },
  },
  plugins: [tailwindAnimate, tailwindTypography],
};

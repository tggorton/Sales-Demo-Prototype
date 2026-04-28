import { createTheme, Theme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    indigo: {
      lightest: string;
      light: string;
      main: string;
      dark: string;
      darkest: string;
    };
    amber: {
      lightest: string;
      light: string;
      main: string;
      dark: string;
      darkest: string;
    };
    glass: {
      background: string;
      backdropFilter: string;
      border: string;
    };
    glassSection: {
      background: string;
      backdropFilter: string;
      borderRadius: string;
      border: string;
      boxShadow: string;
    };
    taxonomy: {
      object: { bg: string };
      location: { bg: string };
      sentiment: { bg: string };
      brandSafety: { bg: string };
      celebrity: { bg: string };
      logo: { bg: string };
      iab: { bg: string };
      emotion: { bg: string };
      semanticTag: { bg: string };
    };
  }
  interface PaletteOptions {
    indigo?: {
      lightest?: string;
      light?: string;
      main?: string;
      dark?: string;
      darkest?: string;
    };
    amber?: {
      lightest?: string;
      light?: string;
      main?: string;
      dark?: string;
      darkest?: string;
    };
    glass?: {
      background?: string;
      backdropFilter?: string;
      border?: string;
    };
    glassSection?: {
      background?: string;
      backdropFilter?: string;
      borderRadius?: string;
      border?: string;
      boxShadow?: string;
    };
    taxonomy?: {
      object?: { bg?: string };
      location?: { bg?: string };
      sentiment?: { bg?: string };
      brandSafety?: { bg?: string };
      celebrity?: { bg?: string };
      logo?: { bg?: string };
      iab?: { bg?: string };
      emotion?: { bg?: string };
      semanticTag?: { bg?: string };
    };
  }
  interface PaletteColor {
    lightest?: string;
    darkest?: string;
    hover?: string;
  }
  interface SimplePaletteColorOptions {
    lightest?: string;
    darkest?: string;
    hover?: string;
  }
  interface Theme {
    customBackground: {
      gradient: string;
    };
  }
  interface ThemeOptions {
    customBackground?: {
      gradient?: string;
    };
  }
}

export type KervTheme = Theme;

export const theme = createTheme({
  palette: {
    primary: {
      light: '#F24C91',
      main: '#ED005E',
      dark: '#DC005C',
      darkest: '#C60057',
      hover: 'rgba(237, 0, 94, 0.08)',
    },
    secondary: { main: '#ED005E' },
    success: {
      main: '#0EB367',
      light: '#C1E8D0',
    },
    indigo: {
      lightest: '#C3C9E6',
      light: '#9DA6D4',
      main: '#7683C3',
      dark: '#5968B7',
      darkest: '#3B4EAB',
    },
    amber: {
      lightest: '#FFF8E1',
      light: '#FFECB3',
      main: '#FFC107',
      dark: '#FF8F00',
      darkest: '#FF6F00',
    },
    error: {
      lightest: '#FFEBEE',
      light: '#FFCDD2',
      main: '#F44336',
      dark: '#D32F2F',
      darkest: '#B71C1C',
    },
    grey: {
      300: '#A1A1A1',
      400: '#7F7F7F',
      500: '#585858',
      600: '#464646',
      700: '#292929',
    },
    text: {
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
    action: {
      selected: '#E7E7E7',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    glass: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    glassSection: {
      background: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: '2px solid rgba(255, 255, 255, 0.8)',
      boxShadow: '0px 4px 8px 0px rgba(0, 0, 0, 0.05)',
    },
    taxonomy: {
      object: { bg: 'rgba(237, 0, 94, 0.08)' },
      location: { bg: 'rgba(33, 150, 243, 0.12)' },
      sentiment: { bg: 'rgba(156, 39, 176, 0.12)' },
      brandSafety: { bg: 'rgba(255, 152, 0, 0.12)' },
      celebrity: { bg: 'rgba(239, 108, 0, 0.08)' },
      logo: { bg: 'rgba(2, 136, 209, 0.08)' },
      iab: { bg: 'rgba(46, 125, 50, 0.08)' },
      emotion: { bg: '#f9fbe7' },
      semanticTag: { bg: 'rgba(0, 0, 0, 0.08)' },
    },
  },
  customBackground: {
    gradient:
      'linear-gradient(128deg, #FFEDF4 8.6%, #E9EBF7 21.38%, #F6F6F6 40%, #FFEDF4 60%, #E9EBF7 80%, #FFEDF4 100%)',
  },
  typography: {
    fontFamily: 'Open Sans, sans-serif',
    h5: {
      fontWeight: 400,
      fontSize: '24px',
      lineHeight: 1.6,
      letterSpacing: 0.0075,
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      fontWeight: 400,
      fontSize: '16px',
      lineHeight: 1.5,
      letterSpacing: 0.0094,
    },
    button: {
      fontWeight: 600,
      fontSize: '14px',
      lineHeight: 1.71,
      letterSpacing: 0.0286,
      textTransform: 'uppercase',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 4,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.MuiInputBase-sizeSmall:not(.MuiInputBase-multiline)': {
            height: 36,
          },
          '&.MuiInputBase-sizeSmall': {
            '& input, & textarea': {},
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 16,
          marginRight: 16,
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        MenuProps: {
          disableScrollLock: true,
          PaperProps: {
            sx: {
              border: '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
      styleOverrides: {
        select: {
          '&.MuiInputBase-inputSizeSmall': {
            padding: '8px 14px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: 'none',
        },
        outlined: {
          boxShadow: 'none',
        },
        text: ({ theme }) => ({
          boxShadow: 'none',
          fontWeight: 600,
          '&:hover': {
            backgroundColor: theme.palette.primary.hover,
            boxShadow: 'none',
          },
          '&:focus': {
            backgroundColor: theme.palette.primary.hover,
          },
          '&:active': {
            backgroundColor: 'rgba(237, 0, 94, 0.12)',
          },
        }),
        root: {
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          '& .MuiPaper-root': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255, 255, 255, 1)',
          borderRadius: '16px',
          boxShadow:
            '0px 9px 46px 8px rgba(0, 0, 0, 0.12), 0px 24px 38px 3px rgba(0, 0, 0, 0.14), 0px 11px 15px -7px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderLeft: '2px solid rgba(255, 255, 255, 1)',
          boxShadow:
            '0px 9px 46px 8px rgba(0, 0, 0, 0.12), 0px 24px 38px 3px rgba(0, 0, 0, 0.14), 0px 11px 15px -7px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          '& .MuiTableRow-root': {
            height: '52px !important',
            minHeight: '52px !important',
            maxHeight: '52px !important',
          },
          '& .MuiTableCell-root': {
            height: '52px !important',
            maxHeight: '52px !important',
            padding: '5.5px 16px !important',
            verticalAlign: 'middle !important',
            boxSizing: 'border-box !important',
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: 'transparent',
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '14px',
            color: theme.palette.text.primary,
            backgroundColor: 'transparent !important',
            borderBottom: `1px solid ${theme.palette.divider}`,
            height: '52px !important',
            maxHeight: '52px !important',
          },
        }),
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: 'transparent',
          minHeight: '52px !important',
          height: '52px !important',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          '& .MuiTableCell-root': {
            height: '52px !important',
            maxHeight: '52px !important',
            padding: '5.5px 16px !important',
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: 'transparent',
          padding: '5.5px 16px !important',
          borderBottom: `1px solid ${theme.palette.divider}`,
          height: '52px !important',
          maxHeight: '52px !important',
          verticalAlign: 'middle !important',
          boxSizing: 'border-box',
        } as any),
        body: ({ theme }) => ({
          fontSize: '14px !important',
          color: theme.palette.text.primary,
        } as any),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.status-active': {
            backgroundColor: '#C1E8D0',
            color: theme.palette.text.primary,
            fontWeight: 500,
          },
          '&.status-inactive': {
            backgroundColor: theme.palette.amber.light,
            color: theme.palette.text.primary,
            fontWeight: 500,
          },
          '&.status-unverified': {
            backgroundColor: theme.palette.action.selected,
            color: theme.palette.text.primary,
            fontWeight: 500,
          },
        }),
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            animation: 'snackbarSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          },
          '@keyframes snackbarSlideIn': {
            '0%': {
              opacity: 0,
              transform: 'translateY(20px) scale(0.9)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow:
            '0px 8px 24px rgba(0, 0, 0, 0.15), 0px 4px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

export const kervTheme = theme;

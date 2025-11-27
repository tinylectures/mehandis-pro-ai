import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  FolderOpen as ProjectIcon,
  Assessment as QuantityIcon,
  AttachMoney as CostIcon,
  CloudUpload as UploadIcon,
  BarChart as ReportIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  AccountCircle,
  Logout,
} from '@mui/icons-material';

// Import pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import BIMUploadPage from './pages/BIMUploadPage';
import QuantityPage from './pages/QuantityPage';
import CostEstimatePage from './pages/CostEstimatePage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
});

const drawerWidth = 240;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Quantity Surveyor',
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
    handleMenuClose();
  };

  const handleLogin = (email: string, password: string) => {
    // Simulate login
    setIsAuthenticated(true);
    setUser({
      name: 'John Doe',
      email: email,
      role: 'Quantity Surveyor',
    });
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, page: 'dashboard' },
    { text: 'Projects', icon: <ProjectIcon />, page: 'projects' },
    { text: 'Upload BIM', icon: <UploadIcon />, page: 'upload' },
    { text: 'Quantities', icon: <QuantityIcon />, page: 'quantities' },
    { text: 'Cost Estimates', icon: <CostIcon />, page: 'costs' },
    { text: 'Reports', icon: <ReportIcon />, page: 'reports' },
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          🏗️ ConstructAI
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={currentPage === item.page}
              onClick={() => {
                setCurrentPage(item.page);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon sx={{ color: currentPage === item.page ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setCurrentPage('settings')}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              {menuItems.find(item => item.page === currentPage)?.text || 'ConstructAI'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">{user.name}</Typography>
              <IconButton onClick={handleMenuOpen} color="inherit">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {user.name.charAt(0)}
                </Avatar>
              </IconButton>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </MenuItem>
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {user.role}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            mt: 8,
          }}
        >
          <Container maxWidth="xl">
            {currentPage === 'dashboard' && <DashboardPage />}
            {currentPage === 'projects' && <ProjectsPage />}
            {currentPage === 'upload' && <BIMUploadPage />}
            {currentPage === 'quantities' && <QuantityPage />}
            {currentPage === 'costs' && <CostEstimatePage />}
            {currentPage === 'reports' && (
              <Typography variant="h4">Reports - Coming Soon</Typography>
            )}
            {currentPage === 'settings' && (
              <Typography variant="h4">Settings - Coming Soon</Typography>
            )}
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;

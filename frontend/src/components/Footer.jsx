import { useState, useEffect } from 'react';
import { Container, Box, Typography, Link as MuiLink, IconButton, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LinkedIn, GitHub, Twitter, Email } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const StyledFooter = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.secondary,
  padding: theme.spacing(6, 0),
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  },
}));

const FooterLink = styled(MuiLink)(({ theme }) => ({
  display: 'block',
  marginBottom: theme.spacing(1),
  transition: 'all 0.3s ease',
  '&:hover': {
    color: theme.palette.primary.main,
    transform: 'translateX(5px)',
  },
}));

const SocialIcon = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  transition: 'all 0.3s ease',
  '&:hover': {
    color: theme.palette.primary.main,
    transform: 'translateY(-3px)',
  },
}));

const Footer = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Update year if component stays mounted across new year
    const interval = setInterval(() => {
      setCurrentYear(new Date().getFullYear());
    }, 1000 * 60 * 60 * 24); // Check daily
    return () => clearInterval(interval);
  }, []);

  const footerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <StyledFooter component="footer">
      <Container maxWidth="lg">
        <Box
          component={motion.div}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={footerVariants}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 4,
            mb: 4,
          }}
        >
          {/* Company Info */}
          <Box component={motion.div} variants={itemVariants}>
            <Typography 
              variant="h5" 
              component={Link} 
              to="/" 
              sx={{ 
                fontWeight: 700,
                textDecoration: 'none',
                color: 'inherit',
                display: 'inline-block',
                mb: 2,
                '&:hover': {
                  color: 'primary.main',
                }
              }}
            >
              LegalAI
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Your intelligent legal document assistant powered by AI
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <SocialIcon 
                component={motion.a} 
                whileHover={{ scale: 1.1 }}
                href="https://linkedin.com" 
                target="_blank"
              >
                <LinkedIn />
              </SocialIcon>
              <SocialIcon 
                component={motion.a} 
                whileHover={{ scale: 1.1 }}
                href="https://github.com" 
                target="_blank"
              >
                <GitHub />
              </SocialIcon>
              <SocialIcon 
                component={motion.a} 
                whileHover={{ scale: 1.1 }}
                href="https://twitter.com" 
                target="_blank"
              >
                <Twitter />
              </SocialIcon>
              <SocialIcon 
                component={motion.a} 
                whileHover={{ scale: 1.1 }}
                href="mailto:contact@legalai.com" 
                target="_blank"
              >
                <Email />
              </SocialIcon>
            </Box>
          </Box>

          {/* Quick Links */}
          <Box component={motion.div} variants={itemVariants}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Quick Links
            </Typography>
            <FooterLink 
              component={Link} 
              to="/" 
              underline="none"
            >
              Home
            </FooterLink>
            <FooterLink 
              component={Link} 
              to="/dashboard" 
              underline="none"
            >
              Dashboard
            </FooterLink>
            <FooterLink 
              component={Link} 
              to="/upload" 
              underline="none"
            >
              Upload Documents
            </FooterLink>
            <FooterLink 
              component={Link} 
              to="/pricing" 
              underline="none"
            >
              Pricing
            </FooterLink>
          </Box>

          {/* Resources */}
          <Box component={motion.div} variants={itemVariants}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Resources
            </Typography>
            <FooterLink 
              component={Link} 
              to="/blog" 
              underline="none"
            >
              Blog
            </FooterLink>
            <FooterLink 
              component={Link} 
              to="/documentation" 
              underline="none"
            >
              Documentation
            </FooterLink>
            <FooterLink 
              component={Link} 
              to="/faq" 
              underline="none"
            >
              FAQs
            </FooterLink>
            <FooterLink 
              component={Link} 
              to="/support" 
              underline="none"
            >
              Support
            </FooterLink>
          </Box>

          {/* Legal */}
          <Box component={motion.div} variants={itemVariants}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Legal
            </Typography>
            <FooterLink 
              component={Link} 
              to="/privacy" 
              underline="none"
            >
              Privacy Policy
            </FooterLink>
            <FooterLink 
              component={Link} 
              to="/terms" 
              underline="none"
            >
              Terms of Service
            </FooterLink>
            <FooterLink 
              component={Link} 
              to="/cookies" 
              underline="none"
            >
              Cookie Policy
            </FooterLink>
            <FooterLink 
              component={Link} 
              to="/gdpr" 
              underline="none"
            >
              GDPR Compliance
            </FooterLink>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box 
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            alignItems: 'center', 
            justifyContent: 'space-between',
            textAlign: 'center'
          }}
        >
          <Typography variant="body2">
            © {currentYear} LegalAI. All rights reserved.
          </Typography>
          <Typography variant="body2" sx={{ mt: { xs: 1, sm: 0 } }}>
            Made with ❤️ for legal professionals worldwide
          </Typography>
        </Box>
      </Container>
    </StyledFooter>
  );
};

export default Footer;
import { useState } from 'react';
import { Box, Typography, Button, Container, Card, CardContent, useTheme } from '@mui/material';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { styled } from '@mui/material/styles';
import { 
  UploadCloud,
  BrainCircuit,
  Lightbulb,
  Rocket,
  ArrowRight,
  BookOpen,
  Gavel,
  Scale
} from 'lucide-react';
import heroImage from '../assets/hero-image.jpg';

// Styled Components
const HeroSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '100vh',
  minHeight: '600px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  color: theme.palette.common.white,
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.7) 0%,
        rgba(0, 0, 0, 0.5) 50%,
        rgba(0, 0, 0, 0.3) 100%
      ),
      url(${heroImage})
    `,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundAttachment: 'fixed',
    zIndex: -1,
    filter: 'brightness(0.8) contrast(1.1) saturate(1.2)',
    animation: 'pan-image 15s linear infinite alternate',
  },
  '@keyframes pan-image': {
    '0%': {
      backgroundPosition: '15% center',
    },
    '100%': {
      backgroundPosition: '85% center',
    },
  },
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s ease',
  borderRadius: '16px',
  boxShadow: theme.shadows[6],
  background: theme.palette.background.paper,
  '&:hover': {
    transform: 'translateY(-10px)',
    boxShadow: theme.shadows[16],
    '& .feature-icon': {
      transform: 'scale(1.1) rotate(5deg)',
    }
  },
}));

const LawBadge = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 16px',
  borderRadius: '24px',
  backgroundColor: 'rgba(255,255,255,0.2)',
  margin: '0 8px 16px 8px',
  backdropFilter: 'blur(4px)',
  '& svg': {
    marginRight: '8px',
  }
}));

const Home = () => {
  const theme = useTheme();
  const [hoveredCard, setHoveredCard] = useState(null);

  const features = [
    {
      title: 'Upload Documents',
      description: 'Securely upload federal, state, and local legal documents in multiple formats.',
      icon: <UploadCloud size={40} />,
      color: theme.palette.primary.main
    },
    {
      title: 'AI Analysis',
      description: 'Advanced NLP algorithms analyze and cross-reference legal documents with precision.',
      icon: <BrainCircuit size={40} />,
      color: theme.palette.secondary.main
    },
    {
      title: 'Get Insights',
      description: 'Receive comprehensive summaries, precedent analysis, and legal interpretations.',
      icon: <Lightbulb size={40} />,
      color: theme.palette.success.main
    }
  ];

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    hover: { scale: 1.05 }
  };

  return (
    <Box sx={{ overflowX: 'hidden' }}>
      {/* Hero Section */}
      <HeroSection>
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Box sx={{ mb: 3 }}>
              <LawBadge component={motion.div} whileHover={{ scale: 1.05 }}>
                <BookOpen size={18} />
                <Typography variant="body2" fontWeight="600">FEDERAL</Typography>
              </LawBadge>
              <LawBadge component={motion.div} whileHover={{ scale: 1.05 }}>
                <Gavel size={18} />
                <Typography variant="body2" fontWeight="600">STATE</Typography>
              </LawBadge>
              <LawBadge component={motion.div} whileHover={{ scale: 1.05 }}>
                <Scale size={18} />
                <Typography variant="body2" fontWeight="600">LOCAL</Typography>
              </LawBadge>
            </Box>
            
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 800,
                textShadow: '0 4px 8px rgba(0,0,0,0.5)',
                fontSize: { xs: '2.5rem', md: '3.75rem' },
                lineHeight: 1.2,
                letterSpacing: '-0.5px',
                mb: 3
              }}
            >
              AI-Powered Legal Document Analysis
            </Typography>
            <Typography 
              variant="h5" 
              paragraph
              sx={{ 
                mb: 4,
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                maxWidth: '800px',
                margin: '0 auto',
                fontWeight: 400,
                opacity: 0.9
              }}
            >
              Upload, summarize, and debate legal documents with our intelligent assistant
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
              <Button
                component={motion.div}
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}
                whileTap={{ scale: 0.95 }}
                variant="contained"
                color="primary"
                size="large"
                component={Link}
                to="/register"
                endIcon={<ArrowRight size={22} />}
                sx={{
                  px: 5,
                  py: 1.8,
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  textTransform: 'none'
                }}
              >
                Get Started
              </Button>
              <Button
                component={motion.div}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                variant="outlined"
                color="inherit"
                size="large"
                component={Link}
                to="/demo"
                sx={{
                  px: 5,
                  py: 1.8,
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  borderWidth: '2px',
                  textTransform: 'none',
                  '&:hover': {
                    borderWidth: '2px',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Live Demo
              </Button>
            </Box>
          </motion.div>
        </Container>
      </HeroSection>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 10 }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Typography 
              variant="h3" 
              component="h2" 
              gutterBottom
              sx={{ 
                fontWeight: 800,
                fontSize: { xs: '2rem', md: '2.5rem' },
                letterSpacing: '-0.5px'
              }}
            >
              How It Works
            </Typography>
            <Typography 
              variant="subtitle1" 
              color="text.secondary"
              sx={{ 
                maxWidth: '700px', 
                margin: '0 auto',
                fontSize: '1.1rem'
              }}
            >
              Three simple steps to transform your legal document review process
            </Typography>
          </motion.div>
        </Box>
        
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 6,
            mt: 4
          }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={variants}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onHoverStart={() => setHoveredCard(index)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <FeatureCard>
                <CardContent sx={{ p: 5, height: '100%' }}>
                  <Box
                    className="feature-icon"
                    sx={{
                      width: '90px',
                      height: '90px',
                      margin: '0 auto 28px',
                      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '24px',
                      backgroundColor: `${feature.color}15`,
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        background: `linear-gradient(135deg, ${feature.color}25, ${feature.color}10)`,
                        borderRadius: '24px',
                      }
                    }}
                  >
                    <AnimatePresence>
                      {hoveredCard === index && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            background: `radial-gradient(circle, ${feature.color}20, transparent 70%)`,
                            borderRadius: '24px',
                          }}
                        />
                      )}
                    </AnimatePresence>
                    <Box sx={{ 
                      display: 'flex',
                      color: feature.color,
                      zIndex: 1,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}>
                      {feature.icon}
                    </Box>
                  </Box>
                  <Typography 
                    variant="h5" 
                    component="h3" 
                    gutterBottom
                    sx={{ 
                      fontWeight: 700, 
                      mb: 2,
                      textAlign: 'center'
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography 
                    color="text.secondary"
                    sx={{ 
                      textAlign: 'center',
                      fontSize: '1.05rem'
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </FeatureCard>
            </motion.div>
          ))}
        </Box>
      </Container>

      {/* CTA Section */}
      <Box sx={{ 
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
        py: 12,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
        }
      }}>
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Typography 
              variant="h3" 
              component="h2" 
              gutterBottom
              sx={{ 
                fontWeight: 800,
                mb: 3,
                fontSize: { xs: '2rem', md: '2.5rem' },
                letterSpacing: '-0.5px'
              }}
            >
              Ready to Transform Your Legal Workflow?
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 4, 
                opacity: 0.9,
                fontSize: '1.25rem'
              }}
            >
              Join thousands of legal professionals who save hours every week with LegalAI
            </Typography>
            <Button
              component={motion.div}
              whileHover={{ 
                scale: 1.05,
                boxShadow: `0 8px 24px ${theme.palette.primary.dark}`
              }}
              whileTap={{ scale: 0.95 }}
              variant="contained"
              color="secondary"
              size="large"
              component={Link}
              to="/pricing"
              endIcon={<Rocket size={22} />}
              sx={{
                px: 6,
                py: 1.8,
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '1.1rem',
                textTransform: 'none'
              }}
            >
              Launch Your Legal AI
            </Button>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme, styled } from '@mui/material/styles';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  Button
} from '@mui/material';
import { 
  BookOpen,
  Gavel,
  Award,
  Globe,
  ArrowRight,
  BarChart2,
  FileText,
  Lightbulb,
  Target,
  TrendingUp,
  MoveRight,
  ZoomIn
} from 'lucide-react';
import heroImage1 from '../assets/hero-image1.jpg';

// Styled Components
const HeroSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '50vh',
  minHeight: '400px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  color: theme.palette.common.white,
  overflow: 'hidden',
  marginTop: '0', // Removed the 64px margin to stick to navbar
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url(${heroImage1})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: -1,
    filter: 'brightness(0.8)',
    animation: 'pan-image 20s linear infinite alternate',
  },
  '@keyframes pan-image': {
    '0%': { backgroundPosition: '20% center' },
    '100%': { backgroundPosition: '80% center' },
  },
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
  borderRadius: '16px',
  boxShadow: theme.shadows[4],
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.shadows[12],
    '& .feature-icon': {
      transform: 'scale(1.1) rotate(5deg)',
      backgroundColor: `${theme.palette.primary.main}20`,
    }
  },
}));

const ImageContainer = styled(motion.div)(({ theme }) => ({
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: theme.shadows[6],
  position: 'relative',
  '& img': {
    width: '100%',
    height: 'auto',
    display: 'block',
    transition: 'transform 0.5s ease, filter 0.5s ease'
  },
  '&:hover img': {
    transform: 'scale(1.05)',
    filter: 'brightness(1.1) contrast(1.1)'
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.1)',
    opacity: 0,
    transition: 'opacity 0.3s ease'
  },
  '&:hover::after': {
    opacity: 1
  }
}));

const About = () => {
  const theme = useTheme();

  const stats = [
    { value: '10,000+', label: 'Documents Analyzed', icon: <FileText size={24} /> },
    { value: '95%', label: 'Accuracy Rate', icon: <BarChart2 size={24} /> },
    { value: '24/7', label: 'Availability', icon: <Globe size={24} /> },
    { value: '100+', label: 'Legal Categories', icon: <BookOpen size={24} /> },
  ];

  const features = [
    {
      title: 'Our Mission',
      description: 'Democratizing legal knowledge through AI-powered document analysis for everyone.',
      icon: <Lightbulb size={40} />,
      color: theme.palette.primary.main
    },
    {
      title: 'Legal Expertise',
      description: 'Built with guidance from top legal professionals and scholars.',
      icon: <Gavel size={40} />,
      color: theme.palette.secondary.main
    },
    {
      title: 'Technology',
      description: 'Cutting-edge NLP and machine learning algorithms at your service.',
      icon: <Award size={40} />,
      color: theme.palette.success.main
    },
  ];

  const futureGoals = [
    {
      title: 'Global Expansion',
      description: 'Extend our services to international legal systems and languages.',
      icon: <Globe size={40} />,
      color: theme.palette.info.main
    },
    {
      title: 'Enhanced Accuracy',
      description: 'Achieve 99% document analysis accuracy through improved algorithms.',
      icon: <Target size={40} />,
      color: theme.palette.warning.main
    },
    {
      title: 'Mobile Accessibility',
      description: 'Develop comprehensive mobile solutions for on-the-go legal analysis.',
      icon: <TrendingUp size={40} />,
      color: theme.palette.error.main
    },
  ];

  const [showFullStory, setShowFullStory] = useState(false);

  return (
    <Box sx={{ overflowX: 'hidden' }}>
      {/* Hero Section - Now starts right after navbar */}
      <HeroSection>
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 800,
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                lineHeight: 1.2,
              }}
            >
              About LegalAI
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                maxWidth: '800px',
                margin: '0 auto',
                opacity: 0.9
              }}
            >
              Transforming legal document analysis with artificial intelligence
            </Typography>
          </motion.div>
        </Container>
      </HeroSection>

      {/* Mission Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                Our Story
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', mb: 2 }}>
                Founded in 2022 by Waqar Ahmad, Muhammad Rizwan Babar, and Muhammad Haseeb, LegalAI was born from the need to make legal document analysis more accessible and efficient.
              </Typography>
              
              {showFullStory && (
                <>
                  <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', mb: 2 }}>
                    Our team combines decades of experience in legal practice with cutting-edge AI research to create tools that empower both legal professionals and individuals navigating the legal system.
                  </Typography>
                  <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', mb: 3 }}>
                    We've processed over 10,000 documents across 100+ legal categories, maintaining a 95% accuracy rate while continuously improving our algorithms.
                  </Typography>
                </>
              )}
              
              <Button
                component={motion.div}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                variant="contained"
                color="primary"
                size="large"
                endIcon={<MoveRight size={20} />}
                onClick={() => setShowFullStory(!showFullStory)}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: '12px',
                  fontWeight: 600,
                }}
              >
                {showFullStory ? 'Show Less' : 'Learn More'}
              </Button>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <ImageContainer
                whileHover={{ scale: 1.02 }}
              >
                <motion.img
                  src="/images/legal-docs.jpg"
                  alt="Legal documents"
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.5 }}
                />
                <Box
                  component={motion.div}
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    zIndex: 2
                  }}
                >
                  <ZoomIn size={48} />
                </Box>
              </ImageContainer>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* Rest of the components remain exactly the same */}
      {/* Stats Section */}
      <Box sx={{ backgroundColor: 'background.paper', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat, index) => (
              <Grid item xs={6} sm={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Box 
                      component={motion.div}
                      whileHover={{ scale: 1.1 }}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText',
                        mb: 2,
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              What Makes Us Different
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ maxWidth: '700px', margin: '0 auto' }}>
              Combining legal expertise with cutting-edge technology
            </Typography>
          </motion.div>
        </Box>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <FeatureCard>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box
                      className="feature-icon"
                      sx={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 24px',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '16px',
                        backgroundColor: `${feature.color}10`,
                        color: feature.color,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </FeatureCard>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Future Goals Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Our Future Goals
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ maxWidth: '700px', margin: '0 auto' }}>
            Where we're heading in the coming years
          </Typography>
        </Box>
        
        <Grid container spacing={4}>
          {futureGoals.map((goal, index) => (
            <Grid item xs={12} md={4} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <FeatureCard>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box
                      className="feature-icon"
                      sx={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 24px',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '16px',
                        backgroundColor: `${goal.color}10`,
                        color: goal.color,
                      }}
                    >
                      {goal.icon}
                    </Box>
                    <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      {goal.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {goal.description}
                    </Typography>
                  </CardContent>
                </FeatureCard>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ 
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        py: 8,
        textAlign: 'center'
      }}>
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              Ready to Experience LegalAI?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              Join thousands of users who are transforming their legal workflows
            </Typography>
            <Button
              component={motion.div}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              variant="contained"
              color="secondary"
              size="large"
              endIcon={<ArrowRight size={20} />}
              sx={{
                px: 6,
                py: 1.5,
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              Get Started Today
            </Button>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
};

export default About;
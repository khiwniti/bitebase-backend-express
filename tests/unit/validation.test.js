describe('Input Validation Tests', () => {
  describe('Location Validation', () => {
    const validateLocation = (location) => {
      if (!location) {
        throw new Error('Location is required');
      }
      
      if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        throw new Error('Latitude and longitude must be numbers');
      }
      
      if (location.latitude < -90 || location.latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      
      if (location.longitude < -180 || location.longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      
      return true;
    };

    test('should validate correct location', () => {
      const location = { latitude: 40.7128, longitude: -74.0060 };
      expect(() => validateLocation(location)).not.toThrow();
    });

    test('should reject missing location', () => {
      expect(() => validateLocation(null)).toThrow('Location is required');
      expect(() => validateLocation(undefined)).toThrow('Location is required');
    });

    test('should reject invalid latitude', () => {
      const location = { latitude: 'invalid', longitude: -74.0060 };
      expect(() => validateLocation(location)).toThrow('Latitude and longitude must be numbers');
    });

    test('should reject out of range latitude', () => {
      const location = { latitude: 91, longitude: -74.0060 };
      expect(() => validateLocation(location)).toThrow('Latitude must be between -90 and 90');
    });

    test('should reject out of range longitude', () => {
      const location = { latitude: 40.7128, longitude: 181 };
      expect(() => validateLocation(location)).toThrow('Longitude must be between -180 and 180');
    });
  });

  describe('Email Validation', () => {
    const validateEmail = (email) => {
      if (!email) {
        throw new Error('Email is required');
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }
      
      return true;
    };

    test('should validate correct email', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow();
      expect(() => validateEmail('user.name+tag@domain.co.uk')).not.toThrow();
    });

    test('should reject invalid email formats', () => {
      expect(() => validateEmail('invalid-email')).toThrow('Invalid email format');
      expect(() => validateEmail('test@')).toThrow('Invalid email format');
      expect(() => validateEmail('@example.com')).toThrow('Invalid email format');
      expect(() => validateEmail('test..test@example.com')).toThrow('Invalid email format');
    });

    test('should reject missing email', () => {
      expect(() => validateEmail('')).toThrow('Email is required');
      expect(() => validateEmail(null)).toThrow('Email is required');
    });
  });

  describe('Password Validation', () => {
    const validatePassword = (password) => {
      if (!password) {
        throw new Error('Password is required');
      }
      
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      
      if (!/(?=.*[a-z])/.test(password)) {
        throw new Error('Password must contain at least one lowercase letter');
      }
      
      if (!/(?=.*[A-Z])/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      
      if (!/(?=.*\d)/.test(password)) {
        throw new Error('Password must contain at least one number');
      }
      
      if (!/(?=.*[!@#$%^&*])/.test(password)) {
        throw new Error('Password must contain at least one special character');
      }
      
      return true;
    };

    test('should validate strong password', () => {
      expect(() => validatePassword('SecurePass123!')).not.toThrow();
      expect(() => validatePassword('MyP@ssw0rd')).not.toThrow();
    });

    test('should reject weak passwords', () => {
      expect(() => validatePassword('weak')).toThrow('Password must be at least 8 characters long');
      expect(() => validatePassword('nouppercase123!')).toThrow('Password must contain at least one uppercase letter');
      expect(() => validatePassword('NOLOWERCASE123!')).toThrow('Password must contain at least one lowercase letter');
      expect(() => validatePassword('NoNumbers!')).toThrow('Password must contain at least one number');
      expect(() => validatePassword('NoSpecialChars123')).toThrow('Password must contain at least one special character');
    });

    test('should reject missing password', () => {
      expect(() => validatePassword('')).toThrow('Password is required');
      expect(() => validatePassword(null)).toThrow('Password is required');
    });
  });

  describe('Business Data Validation', () => {
    const validateBusinessData = (data) => {
      if (!data) {
        throw new Error('Business data is required');
      }
      
      if (!data.location) {
        throw new Error('Business location is required');
      }
      
      if (data.priceRange && (data.priceRange < 1 || data.priceRange > 4)) {
        throw new Error('Price range must be between 1 and 4');
      }
      
      if (data.seatingCapacity && (typeof data.seatingCapacity !== 'number' || data.seatingCapacity < 1)) {
        throw new Error('Seating capacity must be a positive number');
      }
      
      return true;
    };

    test('should validate correct business data', () => {
      const data = {
        location: { latitude: 40.7128, longitude: -74.0060 },
        cuisine: 'italian',
        priceRange: 3,
        seatingCapacity: 50
      };
      expect(() => validateBusinessData(data)).not.toThrow();
    });

    test('should reject missing location', () => {
      const data = { cuisine: 'italian' };
      expect(() => validateBusinessData(data)).toThrow('Business location is required');
    });

    test('should reject invalid price range', () => {
      const data = {
        location: { latitude: 40.7128, longitude: -74.0060 },
        priceRange: 5
      };
      expect(() => validateBusinessData(data)).toThrow('Price range must be between 1 and 4');
    });

    test('should reject invalid seating capacity', () => {
      const data = {
        location: { latitude: 40.7128, longitude: -74.0060 },
        seatingCapacity: -10
      };
      expect(() => validateBusinessData(data)).toThrow('Seating capacity must be a positive number');
    });
  });
});
import { Router } from 'express';
import { shouldShowBonusHalves, setShowBonusHalves } from '../utils/config.js';

export const configRouter = Router();

/**
 * GET /api/config/bonus-halves
 * Get bonus halves visibility setting
 */
configRouter.get('/bonus-halves', (req, res) => {
  try {
    const showHalves = shouldShowBonusHalves();
    res.json({ showHalves });
  } catch (error: any) {
    console.error('Error getting bonus halves config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/config/bonus-halves
 * Set bonus halves visibility setting
 * Body: { showHalves: boolean }
 */
configRouter.post('/bonus-halves', (req, res) => {
  try {
    const { showHalves } = req.body;
    
    if (typeof showHalves !== 'boolean') {
      return res.status(400).json({ error: 'showHalves must be a boolean' });
    }
    
    setShowBonusHalves(showHalves);
    
    res.json({ 
      success: true, 
      showHalves,
      message: `Bonus halves visibility ${showHalves ? 'enabled' : 'disabled'}` 
    });
  } catch (error: any) {
    console.error('Error setting bonus halves config:', error);
    res.status(500).json({ error: error.message });
  }
});


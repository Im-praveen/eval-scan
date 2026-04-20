const express = require('express');
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Template
 *   description: OMR OMR Template structure and metadata
 */

/**
 * @swagger
 * /api/template/structure:
 *   get:
 *     summary: Get block lengths and structure from the XML template
 *     tags: [Template]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   blockId:
 *                     type: string
 *                   length:
 *                     type: integer
 */
router.get('/structure', protect, (req, res) => {
    try {
        const templatePath = path.resolve(process.env.TEMPLATE_PATH || './eBiasharaUK.xml');
        
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ error: 'Template file not found at ' + templatePath });
        }

        const xmlContent = fs.readFileSync(templatePath, 'utf-8');
        
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: ""
        });
        
        const jsonObj = parser.parse(xmlContent);
        const root = jsonObj.customsheet;

        if (!root) {
            return res.status(500).json({ error: 'Invalid XML structure: <customsheet> root not found' });
        }

        const structureMap = {};
        const processElements = (elements, isGrid = false) => {
            if (!elements) return;
            const array = Array.isArray(elements) ? elements : [elements];
            array.forEach(item => {
                if (isGrid) {
                    const bubbleGroups = item.bubblegroup ? (Array.isArray(item.bubblegroup) ? item.bubblegroup : [item.bubblegroup]) : [];
                    structureMap[item.id] = {
                        blockId: item.id,
                        length: bubbleGroups.length
                    };
                } else if (item.id) {
                    const bubbles = item.bubble ? (Array.isArray(item.bubble) ? item.bubble : [item.bubble]) : [];
                    const allowedValues = bubbles.map(b => String(b.value)).filter(v => v !== 'undefined');
                    structureMap[item.id] = {
                        blockId: item.id,
                        allowedValues: allowedValues.length > 0 ? allowedValues : null,
                        length: allowedValues.length > 0 ? allowedValues[0].length : 1
                    };
                }
            });
        };

        if (root.bubblegrid) processElements(root.bubblegrid, true);
        if (root.bubblegroup) processElements(root.bubblegroup, false);

        // Sequence IDs in visual document order
        const structure = [];
        const orderMatches = [...xmlContent.matchAll(/<(?:bubblegrid|bubblegroup)[\s\S]+?id="([^"]+)"/g)];
        orderMatches.forEach(match => {
            const id = match[1];
            if (structureMap[id]) {
                structure.push(structureMap[id]);
            }
        });

        res.json(structure);

    } catch (err) {
        console.error('Error parsing XML:', err);
        res.status(500).json({ error: 'Failed to parse XML template: ' + err.message });
    }
});

module.exports = router;

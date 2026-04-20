const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'eVAL OMR API',
      version: '1.0.0',
      description: 'API documentation for the eVAL OMR OMR Evaluation System',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'teacher'] },
          },
        },
        Test: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            conductDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['scheduled', 'active', 'completed'] },
            blockOrder: { type: 'array', items: { type: 'string' } },
            createdBy: { $ref: '#/components/schemas/User' },
          },
        },
        TestBatch: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            testID: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            errorMessage: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SheetRecord: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            sheetName: { type: 'string' },
            sheetPath: { type: 'string' },
            result: { type: 'object' },
            is_updated: { type: 'boolean' },
            updated_result: { type: 'object' },
            last_modified: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);
module.exports = specs;

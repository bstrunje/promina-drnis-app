import swaggerJsDoc from 'swagger-jsdoc';

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Mountaineering Association API',
      version: '1.0.0',
      description: 'API documentation for Mountaineering Association',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Updated path
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

export default swaggerDocs;
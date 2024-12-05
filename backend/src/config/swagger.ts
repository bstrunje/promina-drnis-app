// src/config/swagger.ts
const API_VERSION = '1.0.0';

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Promina Drnis API Documentation',
        version: API_VERSION,
        description: 'API documentation for the Promina Drnis Mountaineering Association',
        contact: {
            name: 'API Support',
            email: 'support@prominadrnis.hr'
        }
    },
    servers: [
        {
            url: `http://localhost:${process.env.PORT || 3000}`,
            description: 'Development server'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        }
    },
    security: [{
        bearerAuth: []
    }],
    paths: {
        '/api/auth/login': {
            post: {
                tags: ['Authentication'],
                summary: 'Login user',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['full_name', 'password'],
                                properties: {
                                    full_name: {
                                        type: 'string',
                                        example: 'John Doe'
                                    },
                                    password: {
                                        type: 'string',
                                        example: 'password123'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Successful login'
                    },
                    401: {
                        description: 'Invalid credentials'
                    }
                }
            }
        },
        '/api/members': {
            get: {
                tags: ['Members'],
                summary: 'Get all members',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'List of members'
                    },
                    401: {
                        description: 'Unauthorized'
                    }
                }
            },
            post: {
                tags: ['Members'],
                summary: 'Create new member',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['first_name', 'last_name', 'email'],
                                properties: {
                                    first_name: {
                                        type: 'string',
                                        example: 'John'
                                    },
                                    last_name: {
                                        type: 'string',
                                        example: 'Doe'
                                    },
                                    email: {
                                        type: 'string',
                                        format: 'email',
                                        example: 'john@example.com'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: 'Member created successfully'
                    },
                    400: {
                        description: 'Invalid input'
                    }
                }
            }
        },
        '/api/activities': {
            get: {
                tags: ['Activities'],
                summary: 'Get all activities',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'List of activities'
                    },
                    401: {
                        description: 'Unauthorized'
                    }
                }
            },
            post: {
                tags: ['Activities'],
                summary: 'Create new activity',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['title', 'start_date', 'end_date'],
                                properties: {
                                    title: {
                                        type: 'string',
                                        example: 'Mountain Hiking'
                                    },
                                    start_date: {
                                        type: 'string',
                                        format: 'date-time'
                                    },
                                    end_date: {
                                        type: 'string',
                                        format: 'date-time'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: 'Activity created successfully'
                    },
                    400: {
                        description: 'Invalid input'
                    }
                }
            }
        }
    }
};

export default swaggerDefinition;
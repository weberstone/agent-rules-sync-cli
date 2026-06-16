# NestJS Code Rules

## 1. Mandatory Documentation
* **Every Single Class & Method** MUST have a concise comment explaining: **What** it does, **Why** it is written, and its **Purpose**. No exceptions.

## 2. Dependency Injection
* Use **strictly** constructor injection: `constructor(private readonly service: Service)`.
```
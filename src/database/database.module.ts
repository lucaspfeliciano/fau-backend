import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({})
export class DatabaseModule {
  static register(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        MongooseModule.forRoot(
          process.env.MONGODB_URI ?? 'mongodb://localhost:27017/fau-backend',
          {
            dbName: process.env.MONGODB_DB_NAME ?? 'fau-backend',
          },
        ),
      ],
    };
  }
}

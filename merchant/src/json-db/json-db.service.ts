import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { UserModel } from 'types/user';

@Injectable()
export class JsonDbService {
    private readonly filePath = path.resolve(__dirname, '..', 'database.json');

    async readJsonFile(): Promise<UserModel[]> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    async writeJsonFile(data: UserModel[]): Promise<void> {
        await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    }

    async findAll(): Promise<UserModel[]> {
        return this.readJsonFile();
    }

    async findOne(id: number): Promise<UserModel | null> {
        const users = await this.readJsonFile();
        const user = users.find(user => user.id === id);
        return user ? user : null;
    }

    async findOneBySocketAddress(socketAddress: string): Promise<UserModel | null> {
        const users = await this.readJsonFile();
        const user = users.find(user => user.socketAddress === socketAddress);
        return user ? user : null;
    }

    async create(user: UserModel): Promise<UserModel> {
        const users = await this.readJsonFile();
        user.id = users.length ? users[users.length - 1].id + 1 : 1;
        users.push(user);
        await this.writeJsonFile(users);
        return user;
    }

    async update(id: number, newUser: Partial<UserModel>): Promise<void> {
        const users = await this.readJsonFile();
        const userIndex = users.findIndex(user => user.id === id);
        if (userIndex === -1) {
            throw new Error('User not found');
        }
        users[userIndex] = { ...users[userIndex], ...newUser };
        await this.writeJsonFile(users);
    }

    async remove(id: number): Promise<void> {
        let users = await this.readJsonFile();
        users = users.filter(user => user.id !== id);
        await this.writeJsonFile(users);
    }
}

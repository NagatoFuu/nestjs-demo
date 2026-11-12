import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import type { User } from './user.interface';
import { UserService } from './user.service';

describe('UserController', () => {
  let module: TestingModule;
  let controller: UserController;
  let findAll: jest.MockedFunction<UserService['findAll']>;
  let findOne: jest.MockedFunction<UserService['findOne']>;
  let create: jest.MockedFunction<UserService['create']>;
  let replace: jest.MockedFunction<UserService['replace']>;
  let update: jest.MockedFunction<UserService['update']>;

  const user: User = {
    id: 'user-42',
    name: 'Controller test user',
    email: 'controller@example.com',
  };

  beforeEach(async () => {
    findAll = jest.fn().mockReturnValue([user]);
    findOne = jest.fn().mockReturnValue(user);
    create = jest.fn().mockReturnValue(user);
    replace = jest.fn().mockReturnValue(user);
    update = jest.fn().mockReturnValue(user);

    const userService: jest.Mocked<
      Pick<UserService, 'findAll' | 'findOne' | 'create' | 'replace' | 'update'>
    > = {
      findAll,
      findOne,
      create,
      replace,
      update,
    };

    module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userService }],
    }).compile();

    controller = module.get(UserController);
  });

  afterEach(async () => {
    await module.close();
  });

  it('delegates the list query to UserService', () => {
    expect(controller.findAll()).toEqual([user]);
    expect(findAll).toHaveBeenCalledTimes(1);
    expect(findAll).toHaveBeenCalledWith();
  });

  it('passes the supplied ID to UserService and returns its result', () => {
    expect(controller.findOne('user-42')).toBe(user);
    expect(findOne).toHaveBeenCalledWith('user-42');
  });

  it('propagates the missing-user exception from UserService', () => {
    const error = new NotFoundException('User missing not found');
    findOne.mockImplementation(() => {
      throw error;
    });

    expect(() => controller.findOne('missing')).toThrow(error);
    expect(findOne).toHaveBeenCalledWith('missing');
  });

  it('passes the request body to UserService', () => {
    const input = { name: 'Carol', email: 'carol@example.com' };

    expect(controller.create(input)).toBe(user);
    expect(create).toHaveBeenCalledWith(input);
  });

  it('delegates full replacement with the route ID and body', () => {
    const input = { name: 'New', email: 'new@example.com' };
    expect(controller.replace('user-42', input)).toBe(user);
    expect(replace).toHaveBeenCalledWith('user-42', input);
  });

  it('delegates partial updates with the route ID and body', () => {
    const input = { name: 'Renamed' };
    expect(controller.update('user-42', input)).toBe(user);
    expect(update).toHaveBeenCalledWith('user-42', input);
  });
});

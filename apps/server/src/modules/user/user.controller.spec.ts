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

  const user: User = {
    id: 'user-42',
    name: 'Controller test user',
    email: 'controller@example.com',
  };

  beforeEach(async () => {
    findAll = jest.fn().mockReturnValue([user]);
    findOne = jest.fn().mockReturnValue(user);

    const userService: jest.Mocked<Pick<UserService, 'findAll' | 'findOne'>> = {
      findAll,
      findOne,
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
});

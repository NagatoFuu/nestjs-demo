import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InMemoryUserRepository } from './in-memory-user.repository';
import type { User } from './user.interface';
import { UserService } from './user.service';

describe('UserService (isolated)', () => {
  let module: TestingModule;
  let service: UserService;
  let findAllUsers: jest.MockedFunction<InMemoryUserRepository['findAll']>;
  let findUser: jest.MockedFunction<InMemoryUserRepository['findOne']>;
  let createUser: jest.MockedFunction<InMemoryUserRepository['create']>;
  let replaceUser: jest.MockedFunction<InMemoryUserRepository['replace']>;
  let updateUser: jest.MockedFunction<InMemoryUserRepository['update']>;
  let removeUser: jest.MockedFunction<InMemoryUserRepository['remove']>;

  const user: User = { id: '1', name: 'Alice', email: 'alice@example.com' };

  beforeEach(async () => {
    findAllUsers = jest.fn().mockReturnValue([user]);
    findUser = jest.fn().mockReturnValue(user);
    createUser = jest.fn().mockReturnValue(user);
    replaceUser = jest.fn().mockReturnValue(user);
    updateUser = jest.fn().mockReturnValue(user);
    removeUser = jest.fn().mockReturnValue(true);
    const repository = {
      findAll: findAllUsers,
      findOne: findUser,
      create: createUser,
      replace: replaceUser,
      update: updateUser,
      remove: removeUser,
    } satisfies jest.Mocked<
      Pick<
        InMemoryUserRepository,
        'findAll' | 'findOne' | 'create' | 'replace' | 'update' | 'remove'
      >
    >;
    module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: InMemoryUserRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(UserService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('delegates list queries to the repository', () => {
    expect(service.findAll()).toEqual([user]);
    expect(findAllUsers).toHaveBeenCalledTimes(1);
  });

  it('maps a missing repository result to NotFoundException', () => {
    findUser.mockReturnValue(undefined);
    expect(() => service.findOne('missing')).toThrow(NotFoundException);
    expect(findUser).toHaveBeenCalledWith('missing');
  });

  it('validates and selects creation fields before calling storage', () => {
    expect(
      service.create({ id: 'fake', name: 'Alice', email: 'alice@example.com' }),
    ).toBe(user);
    expect(createUser).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
    });
  });

  it('does not call storage for invalid creation input', () => {
    expect(() => service.create({ name: 'Alice' })).toThrow(
      BadRequestException,
    );
    expect(createUser).not.toHaveBeenCalled();
  });

  it('does not write a replacement when full-field validation fails', () => {
    expect(() => service.replace('1', { name: 'New' })).toThrow(
      BadRequestException,
    );
    expect(replaceUser).not.toHaveBeenCalled();
  });

  it('passes only provided editable fields to a partial update', () => {
    expect(service.update('1', { name: 'New', role: 'admin' })).toBe(user);
    expect(updateUser).toHaveBeenCalledWith('1', { name: 'New' });
  });

  it('gives a missing target priority over invalid update input', () => {
    findUser.mockReturnValue(undefined);
    expect(() => service.update('missing', {})).toThrow(NotFoundException);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('maps a failed deletion to NotFoundException', () => {
    removeUser.mockReturnValue(false);
    expect(() => service.remove('missing')).toThrow(NotFoundException);
    expect(removeUser).toHaveBeenCalledWith('missing');
  });

  it.each(['replace', 'update'] as const)(
    'handles a missing result from %s even after a successful lookup',
    (method) => {
      if (method === 'replace') {
        replaceUser.mockReturnValue(undefined);
      } else {
        updateUser.mockReturnValue(undefined);
      }
      expect(() =>
        service[method]('1', { name: 'New', email: 'new@example.com' }),
      ).toThrow(NotFoundException);
    },
  );
});

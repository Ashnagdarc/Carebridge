// CareBridge: Test coverage for this module behavior.
import { BadRequestException } from '@nestjs/common';
import { DataRequestController } from './data-request.controller';
import { DataRequestService } from './data-request.service';
import { DataType, DataRequestStatus } from './dto/data-request.dto';

describe('DataRequestController', () => {
  let controller: DataRequestController;
  let service: jest.Mocked<DataRequestService>;

  beforeEach(() => {
    service = {
      createDataRequest: jest.fn(),
      getDataRequestById: jest.fn(),
      listDataRequests: jest.fn(),
      getHospitalDataRequests: jest.fn(),
      getIncomingDataRequests: jest.fn(),
      getDataRequestStats: jest.fn(),
    } as any;

    controller = new DataRequestController(service);
  });

  it('creates a data request for authenticated hospital', async () => {
    service.createDataRequest.mockResolvedValue({
      id: 'req_1',
      patientId: 'pat_1',
      sourceHospitalId: 'hosp_1',
      targetHospitalId: 'hosp_2',
      dataTypes: [DataType.ALLERGIES],
      status: DataRequestStatus.PENDING,
      requestedAt: new Date(),
    } as any);

    const result = await controller.createDataRequest(
      {
        patientId: 'pat_1',
        sourceHospitalId: 'hosp_1',
        targetHospitalId: 'hosp_2',
        dataTypes: [DataType.ALLERGIES],
      } as any,
      { user: { hospitalId: 'hosp_1' } } as any,
    );

    expect(service.createDataRequest).toHaveBeenCalledWith(
      expect.any(Object),
      'hosp_1',
    );
    expect(result).toHaveProperty('id', 'req_1');
  });

  it('gets a data request by id', async () => {
    service.getDataRequestById.mockResolvedValue({ id: 'req_1' } as any);
    await controller.getDataRequest('req_1');
    expect(service.getDataRequestById).toHaveBeenCalledWith('req_1');
  });

  it('lists data requests with parsed pagination', async () => {
    service.listDataRequests.mockResolvedValue({ requests: [], total: 0, skip: 5, take: 10 } as any);

    await controller.listDataRequests({ skip: '5' as any, take: '10' as any } as any);

    expect(service.listDataRequests).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 10 }),
    );
  });

  it('rejects list take > 500', async () => {
    await expect(controller.listDataRequests({ take: '999' as any } as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('gets outgoing requests with parsed pagination', async () => {
    service.getHospitalDataRequests.mockResolvedValue({ requests: [], total: 0, skip: 1, take: 2 } as any);
    await controller.getHospitalOutgoingRequests({ user: { hospitalId: 'hosp_1' } } as any, '1', '2');
    expect(service.getHospitalDataRequests).toHaveBeenCalledWith('hosp_1', 1, 2);
  });

  it('rejects outgoing take > 500', async () => {
    await expect(
      controller.getHospitalOutgoingRequests({ user: { hospitalId: 'hosp_1' } } as any, '0', '501'),
    ).rejects.toThrow(BadRequestException);
  });

  it('gets incoming requests with parsed pagination', async () => {
    service.getIncomingDataRequests.mockResolvedValue({ requests: [], total: 0, skip: 3, take: 4 } as any);
    await controller.getHospitalIncomingRequests({ user: { hospitalId: 'hosp_1' } } as any, '3', '4');
    expect(service.getIncomingDataRequests).toHaveBeenCalledWith('hosp_1', 3, 4);
  });

  it('rejects incoming take > 500', async () => {
    await expect(
      controller.getHospitalIncomingRequests({ user: { hospitalId: 'hosp_1' } } as any, '0', '999'),
    ).rejects.toThrow(BadRequestException);
  });

  it('gets hospital stats', async () => {
    service.getDataRequestStats.mockResolvedValue({ total: 0 } as any);
    await controller.getHospitalStats({ user: { hospitalId: 'hosp_1' } } as any);
    expect(service.getDataRequestStats).toHaveBeenCalledWith('hosp_1');
  });
});


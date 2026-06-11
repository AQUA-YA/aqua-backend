import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ChatMessageType } from '../../../common/interfaces/enums';

export class CreateChatMessageDto {
  @IsEnum(ChatMessageType)
  @IsOptional()
  messageType?: string;

  @IsString()
  content: string;
}

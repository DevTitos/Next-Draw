from hiero_sdk_python import (
    Client,
    Network,
    AccountId,
    PrivateKey,
    TopicId,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
)
from cryptography.fernet import Fernet
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

operator_id = AccountId.from_string(os.getenv("OPERATOR_ID"))
operator_key = PrivateKey.from_string_ed25519(os.getenv("OPERATOR_KEY"))

# Load encryption key
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError("Missing ENCRYPTION_KEY in environment variables.")
fernet = Fernet(ENCRYPTION_KEY.encode())


def encrypt_message(message: str) -> str:
    """
    Encrypts a plaintext message using Fernet symmetric encryption.

    Args:
        message (str): The plaintext message to encrypt.

    Returns:
        str: The encrypted message as a UTF-8 string.
    """
    try:
        encrypted = fernet.encrypt(message.encode())
        return encrypted.decode()
    except Exception as e:
        raise ValueError(f"Encryption failed: {str(e)}")


def create_topic():
    """
    Creates a new Hedera Consensus Service topic.

    Returns:
        TopicId: The ID of the created topic.
    """
    network = Network(network="testnet")
    client = Client(network)
    client.set_operator(operator_id, operator_key)

    transaction = (
        TopicCreateTransaction(
            memo="Star Governance",
            admin_key=operator_key.public_key(),
        )
        .freeze_with(client)
        .sign(operator_key)
    )

    try:
        receipt = transaction.execute(client)
        if receipt and receipt.topicId:
            print(f"✅ Topic created with ID: {receipt.topic_id}")
            return receipt.topicId
        else:
            print("❌ Topic creation failed: No topic ID returned.")
    except Exception as e:
        print(f"❌ Topic creation failed: {str(e)}")


def submit_message(message: str):
    """
    Encrypts and submits a message to the specified HCS topic.

    Args:
        message (str): Plaintext message to submit.

    Returns:
        dict: Result status and topic ID.
    """
    network = Network(network="testnet")
    client = Client(network)
    topic_id = TopicId.from_string(os.getenv("TOPIC_ID"))
    client.set_operator(operator_id, operator_key)

    try:
        encrypted_message = encrypt_message(message)
        transaction = (
            TopicMessageSubmitTransaction(topic_id=topic_id, message=encrypted_message)
            .freeze_with(client)
            .sign(operator_key)
        )

        receipt = transaction.execute(client)
        print(f"✅ Encrypted message submitted to topic {topic_id}.")
        return {"status": "success", "topic": str(topic_id)}

    except Exception as e:
        print(f"❌ Message submission failed: {str(e)}")
        return {"status": "failed", "message": f"Vote submission failed: {str(e)}"}
